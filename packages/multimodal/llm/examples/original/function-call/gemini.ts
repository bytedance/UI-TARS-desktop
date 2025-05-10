import {
  Content,
  FunctionDeclaration,
  FunctionResponse,
  FunctionCall,
  GenerateContentConfig,
  GoogleGenAI,
  Type,
} from '@google/genai';

/**
 * An example for function call with gemini.
 *
 * @see https://ai.google.dev/gemini-api/docs/function-calling?example=meeting#javascript_1
 */
async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const getWeatherFunctionDeclaration: FunctionDeclaration = {
    name: 'get_weather',
    description: 'Gets weather information for a specified location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'Location name, such as city name',
        },
      },
      required: ['location'],
    },
  };

  function getWeather(args: { location: string }) {
    return {
      location: args.location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  }

  const contents: Content[] = [
    {
      role: 'user',
      parts: [{ text: 'How is the weather in Boston today?' }],
    },
  ];

  const config: GenerateContentConfig = {
    tools: [
      {
        functionDeclarations: [getWeatherFunctionDeclaration],
      },
    ],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: contents,
    config,
  });

  console.log(JSON.stringify(response, null, 2));

  let result: ReturnType<typeof getWeather> | undefined;
  let functionCall: FunctionCall | undefined;

  if (response.functionCalls && response.functionCalls.length > 0) {
    functionCall = response.functionCalls[0]; // Assuming one function call
    console.log(`Function to call: ${functionCall.name}`);
    console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);
    result = await getWeather(functionCall.args as { location: string });
    console.log(`Function execution result: ${JSON.stringify(result)}`);
  } else {
    console.log('No function call found in the response.');
    console.log(response.text);
  }

  /**
   * Next loop
   */
  if (result) {
    const getWeatherFunctionResponse: FunctionResponse = {
      name: getWeatherFunctionDeclaration.name,
      response: { result },
    };

    contents.push({ role: 'model', parts: [{ functionCall: functionCall }] });
    contents.push({
      role: 'user',
      parts: [{ functionResponse: getWeatherFunctionResponse }],
    });

    const finalResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: config,
    });

    console.log(JSON.stringify(finalResponse, null, 2));
    console.log(`Final Response: ${finalResponse.text}`);
  }
}

main();
