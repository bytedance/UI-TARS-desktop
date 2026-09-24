/**
 * Vertex AI handler for Google Cloud's managed Gemini API.
 *
 * This handler uses Google Cloud authentication (Application Default Credentials
 * or service account key) instead of API keys, making it suitable for enterprise
 * and production GCP deployments.
 *
 * The Vertex AI SDK exposes the same generative model interface as the public
 * Gemini API (@google/generative-ai), so we reuse the conversion utilities from
 * the existing Gemini handler.
 */

import {
  Content,
  FinishReason,
  FunctionCallingMode,
  GenerateContentRequest,
  GenerateContentResult,
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  StreamGenerateContentResult,
  VertexAI,
} from '@google-cloud/vertexai';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import { ChatCompletionChunk, ChatCompletionContentPart } from 'openai/resources/index';
import { ChatCompletionMessageToolCall } from 'openai/src/resources/index.js';

import { ProviderCompletionParams, VertexAIModel } from '../chat/index.js';
import { CompletionResponse, StreamCompletionResponse } from '../userTypes/index.js';
import { BaseHandler } from './base.js';
import { InputError } from './types.js';
import {
  consoleWarn,
  convertMessageContentToString,
  fetchThenParseImage,
  getTimestamp,
} from './utils.js';

// Reuse the same message conversion logic as the Gemini handler since
// Vertex AI uses identical content formats.

const convertRole = (role: 'function' | 'system' | 'user' | 'assistant' | 'tool') => {
  switch (role) {
    case 'assistant':
      return 'model';
    case 'function':
    case 'tool':
    case 'user':
    case 'system':
      return 'user';
    default:
      throw new InputError(`Unexpected message role: ${role}`);
  }
};

const convertContentsToParts = async (
  contents: Array<ChatCompletionContentPart> | string | null | undefined,
  systemPrefix: string,
): Promise<Part[]> => {
  if (contents === null || contents === undefined) {
    return [];
  }

  if (typeof contents === 'string') {
    return [{ text: `${systemPrefix}${contents}` }];
  } else {
    const allParts: Promise<Part>[] = contents.map(async (part) => {
      if (part.type === 'text') {
        return { text: `${systemPrefix}${part.text}` };
      } else if (part.type === 'image_url') {
        const imageData = await fetchThenParseImage(part.image_url.url);
        return {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.content,
          },
        };
      } else {
        throw new InputError(
          `Invalid content part type: ${(part as any).type}. Must be "text" or "image_url".`,
        );
      }
    });
    return Promise.all(allParts);
  }
};

const convertAssistantMessage = (
  message: OpenAI.Chat.Completions.ChatCompletionMessage,
): Content => {
  const parts: Part[] = message.tool_calls
    ? message.tool_calls.map((call) => ({
        functionCall: {
          name: call.function.name,
          args: JSON.parse(call.function.arguments),
        },
      }))
    : [];

  if (message.content !== null) {
    parts.push({ text: message.content });
  }

  return { role: convertRole(message.role), parts };
};

const convertMessageToContent = async (
  message: OpenAI.Chat.Completions.ChatCompletionMessageParam,
  includeSystemPrefix: boolean,
): Promise<Content> => {
  switch (message.role) {
    case 'tool':
      return {
        role: convertRole(message.role),
        parts: [
          {
            functionResponse: {
              name: message.tool_call_id,
              response: JSON.parse(convertMessageContentToString(message.content)),
            },
          },
        ],
      };
    case 'assistant':
      return convertAssistantMessage(message as OpenAI.Chat.Completions.ChatCompletionMessage);
    case 'user':
    case 'system':
      const systemPrefix = message.role === 'system' && includeSystemPrefix ? 'System:\n' : '';
      return {
        role: convertRole(message.role),
        parts: await convertContentsToParts(message.content, systemPrefix),
      };
    default:
      throw new InputError(`Unexpected message role: ${message.role}`);
  }
};

const convertMessagesToContents = async (
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<{
  contents: Content[];
  systemInstruction: Content | undefined;
}> => {
  const clonedMessages = structuredClone(messages);

  let systemInstruction: Content | undefined;
  if (clonedMessages.length > 0 && clonedMessages[0].role === 'system') {
    const systemMessage = clonedMessages.shift();
    systemInstruction =
      systemMessage !== undefined ? await convertMessageToContent(systemMessage, false) : undefined;
  }

  const converted: Array<Content> = [];
  for (const message of clonedMessages) {
    if (message.role === 'system' || message.role === 'user') {
      converted.push(await convertMessageToContent(message, true));
    } else if (message.role === 'assistant') {
      converted.push(await convertMessageToContent(message, true));
      if (message.tool_calls !== undefined) {
        for (const assistantToolCall of message.tool_calls) {
          const toolResult = clonedMessages.find(
            (m) => m.role === 'tool' && m.tool_call_id === assistantToolCall.id,
          );
          if (toolResult === undefined) {
            throw new Error(`Could not find tool message with the id: ${assistantToolCall.id}`);
          }
          converted.push(await convertMessageToContent(toolResult, true));
        }
      }
    }
  }

  return { contents: converted, systemInstruction };
};

const convertFinishReason = (
  finishReason: string,
  parts: Part[] | undefined,
): 'stop' | 'length' | 'tool_calls' | 'content_filter' => {
  if (parts?.some((part) => 'functionCall' in part)) {
    return 'tool_calls';
  }

  switch (finishReason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content_filter';
    default:
      return 'stop';
  }
};

const convertToolCalls = (
  candidate: any,
): Array<ChatCompletionMessageToolCall> | undefined => {
  const toolCalls = candidate.content?.parts
    ?.filter((part: any) => part.functionCall !== undefined)
    .map((part: any, index: number) => ({
      id: nanoid(),
      index,
      function: {
        arguments: JSON.stringify(part.functionCall.args),
        name: part.functionCall.name,
      },
      type: 'function' as const,
    }));

  if (toolCalls !== undefined && toolCalls.length > 0) {
    return toolCalls;
  }
  return undefined;
};

const convertStreamToolCalls = (
  candidate: any,
): Array<ChatCompletionChunk.Choice.Delta.ToolCall> | undefined => {
  return convertToolCalls(candidate)?.map((toolCall, index) => ({
    ...toolCall,
    index,
  }));
};

const convertResponseMessage = (
  candidate: any,
): CompletionResponse['choices'][number]['message'] => ({
  content: candidate.content?.parts?.map((part: any) => part.text).join('') ?? null,
  role: 'assistant',
  tool_calls: convertToolCalls(candidate),
  refusal: null,
});

const convertToolConfig = (
  toolChoice: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined,
) => {
  if (typeof toolChoice === 'object') {
    return {
      functionCallingConfig: {
        mode: FunctionCallingMode.ANY,
        allowedFunctionNames: [toolChoice.function.name],
      },
    };
  }

  switch (toolChoice) {
    case 'auto':
      return { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
    case 'none':
      return { functionCallingConfig: { mode: FunctionCallingMode.NONE } };
    case 'required':
      return { functionCallingConfig: { mode: FunctionCallingMode.ANY } };
    default:
      return {
        functionCallingConfig: {
          mode: tools && tools.length > 0 ? FunctionCallingMode.AUTO : FunctionCallingMode.NONE,
        },
      };
  }
};

const convertTools = (tools: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined) => {
  if (tools === undefined) {
    return undefined;
  }

  return tools.map((tool) => ({
    functionDeclarations: [
      {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters as any,
      },
    ],
  }));
};

const convertResponse = (
  result: GenerateContentResult,
  model: string,
  timestamp: number,
): CompletionResponse => {
  const response = result.response;
  return {
    id: null,
    object: 'chat.completion',
    created: timestamp,
    model,
    choices:
      response.candidates?.map((candidate: any) => ({
        index: candidate.index,
        finish_reason: candidate.finishReason
          ? convertFinishReason(candidate.finishReason, candidate.content?.parts)
          : 'stop',
        message: convertResponseMessage(candidate),
        logprobs: null,
      })) ?? [],
    usage: response.usageMetadata
      ? {
          completion_tokens: response.usageMetadata.candidatesTokenCount ?? 0,
          prompt_tokens: response.usageMetadata.promptTokenCount ?? 0,
          total_tokens: response.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
};

async function* convertStreamResponse(
  result: StreamGenerateContentResult,
  model: string,
  timestamp: number,
): StreamCompletionResponse {
  for await (const chunk of result.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    yield {
      id: null,
      object: 'chat.completion.chunk',
      created: timestamp,
      model,
      choices:
        chunk.candidates?.map((candidate: any) => ({
          index: candidate.index,
          finish_reason: candidate.finishReason
            ? convertFinishReason(candidate.finishReason, candidate.content?.parts)
            : 'stop',
          delta: {
            content: text,
            tool_calls: convertStreamToolCalls(candidate),
            role: 'assistant',
          },
          logprobs: null,
        })) ?? [],
      usage: chunk.usageMetadata
        ? {
            completion_tokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
            prompt_tokens: chunk.usageMetadata.promptTokenCount ?? 0,
            total_tokens: chunk.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }
}

export class VertexAIHandler extends BaseHandler<VertexAIModel> {
  async create(
    body: ProviderCompletionParams<'vertex-ai'>,
  ): Promise<CompletionResponse | StreamCompletionResponse> {
    this.validateInputs(body);

    const project =
      this.opts.vertexAI?.project ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
    const location = this.opts.vertexAI?.location ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

    if (!project) {
      throw new InputError(
        'Google Cloud project is required for Vertex AI. Set the "vertexAI.project" option or define GOOGLE_CLOUD_PROJECT in your environment.',
      );
    }

    const vertexAI = new VertexAI({
      project,
      location,
      googleAuthOptions: this.opts.vertexAI?.googleAuthOptions,
    });

    const stop = typeof body.stop === 'string' ? [body.stop] : body.stop;
    const responseMimeType =
      body.response_format?.type === 'json_object' ? 'application/json' : undefined;

    const model = vertexAI.getGenerativeModel({
      model: body.model,
      generationConfig: {
        maxOutputTokens: body.max_tokens ?? undefined,
        temperature: body.temperature ?? undefined,
        topP: body.top_p ?? undefined,
        stopSequences: stop ?? undefined,
        candidateCount: body.n ?? undefined,
        responseMimeType,
      },
    });

    const { contents, systemInstruction } = await convertMessagesToContents(body.messages);
    const params: GenerateContentRequest = {
      contents,
      toolConfig: convertToolConfig(body.tool_choice, body.tools),
      tools: convertTools(body.tools),
      systemInstruction,
    };

    const timestamp = getTimestamp();
    if (body.stream) {
      const result = await model.generateContentStream(params);
      return convertStreamResponse(result, body.model, timestamp);
    } else {
      const result = await model.generateContent(params);
      return convertResponse(result, body.model, timestamp);
    }
  }
}
