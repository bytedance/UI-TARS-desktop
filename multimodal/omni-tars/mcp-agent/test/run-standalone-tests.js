#!/usr/bin/env node
/**
 * Pure-JS standalone test for MCP JSON parser logic.
 * Replicates McpJsonParser.parse() and DynamicMcpToolRegistry logic in plain JS
 * to verify correctness without needing any workspace deps.
 */

'use strict';

// ── Replicate the core parsing logic from mcp-json-parser.ts ─────────────────

class ZodStub {
  optional() { return this; }
  describe() { return this; }
}
class ZodString extends ZodStub {}
class ZodNumber extends ZodStub { int() { return this; } }
class ZodBoolean extends ZodStub {}
class ZodArray extends ZodStub {
  constructor(inner) { super(); this._inner = inner; }
}
class ZodRecord extends ZodStub {
  constructor(inner) { super(); this._inner = inner; }
}
const z = {
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  boolean: () => new ZodBoolean(),
  array: (i) => new ZodArray(i),
  record: (i) => new ZodRecord(i),
  unknown: () => new ZodStub(),
  object: (shape) => {
    const o = { _type: 'object', shape };
    o.optional = () => o;
    o.describe = () => o;
    return o;
  },
};

class Tool {
  constructor({ id, description, parameters, function: fn }) {
    this.name = id;
    this.id = id;
    this.description = description;
    this.schema = parameters;
    this.function = fn;
  }
}

// ── Actual McpJsonParser logic (transcribed from TypeScript) ─────────────────

function jsonSchemaToZod(schema, toolName) {
  const shape = {};
  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const [key, propDef] of Object.entries(properties)) {
    let zodType;
    const prop = propDef;

    switch (prop.type) {
      case 'string': zodType = z.string(); break;
      case 'number': zodType = z.number(); break;
      case 'integer': zodType = z.number().int(); break;
      case 'boolean': zodType = z.boolean(); break;
      case 'array': zodType = z.array(z.unknown()); break;
      case 'object': zodType = z.record(z.unknown()); break;
      default: zodType = z.unknown();
    }

    if (prop.description) {
      zodType.describe(prop.description);
    }

    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

function parseToolDefinition(def) {
  if (!def || typeof def !== 'object') {
    return { error: 'Tool definition must be an object' };
  }

  const obj = def;
  const name = typeof obj.name === 'string' ? obj.name : String(obj.name);

  if (!name) {
    return { error: 'Tool missing required field: name' };
  }

  const description = typeof obj.description === 'string' ? obj.description : '';
  const rawSchema = obj.inputSchema ?? obj.input_schema;

  if (!rawSchema || typeof rawSchema !== 'object') {
    return { error: `Tool "${name}" missing required field: inputSchema` };
  }

  const schema = rawSchema;
  const zodSchema = jsonSchemaToZod(schema, name);

  return {
    tool: new Tool({
      id: name,
      description,
      parameters: zodSchema,
      function: async () =>
        `Tool "${name}" called. Please implement the handler via McpJsonParser.registerHandler().`,
    }),
  };
}

function parse(jsonString) {
  const tools = [];
  const errors = [];

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    errors.push(`Invalid JSON: ${e.message}`);
    return { tools, errors };
  }

  if (!parsed || typeof parsed !== 'object') {
    errors.push('JSON must be an object');
    return { tools, errors };
  }

  const obj = parsed;

  if (Array.isArray(obj.tools)) {
    for (const toolDef of obj.tools) {
      const result = parseToolDefinition(toolDef);
      if (result.tool) tools.push(result.tool);
      if (result.error) errors.push(result.error);
    }
    return { tools, errors };
  }

  if (obj.name && typeof obj.name === 'string') {
    const result = parseToolDefinition(obj);
    if (result.tool) tools.push(result.tool);
    if (result.error) errors.push(result.error);
    return { tools, errors };
  }

  errors.push(
    'Unrecognized MCP JSON format. Expected either:\n' +
      '  1. { "tools": [...] } — MCP tools/list response\n' +
      '  2. { "name": "...", "input_schema": {...} } — single tool object',
  );
  return { tools, errors };
}

function registerHandler(tools, handlers) {
  for (const tool of tools) {
    const handler = handlers[tool.name];
    if (handler) {
      tool.function = handler;
    }
  }
}

function createToolsWithHandlers(jsonString, handlers) {
  const { tools, errors } = parse(jsonString);
  if (tools.length > 0) {
    registerHandler(tools, handlers);
  }
  return { tools, errors };
}

// ── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function run() {
  console.log('\nMcpJsonParser.parse()');

  test('should parse standard MCP tools/list format', () => {
    const input = {
      tools: [
        {
          name: 'Search',
          description: 'Search the web',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'The search query' } },
            required: ['query'],
          },
        },
        {
          name: 'LinkReader',
          inputSchema: {
            type: 'object',
            properties: { url: { type: 'string' }, description: { type: 'string' } },
            required: ['url'],
          },
        },
      ],
    };
    const { tools, errors } = parse(JSON.stringify(input));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 2) throw new Error(`Expected 2 tools, got ${tools.length}`);
    if (tools[0].name !== 'Search') throw new Error(`Expected Search, got ${tools[0].name}`);
    if (tools[1].name !== 'LinkReader') throw new Error(`Expected LinkReader, got ${tools[1].name}`);
  });

  test('should parse legacy single-tool format with input_schema key', () => {
    const input = {
      name: 'my_calculator',
      description: 'Perform calculations',
      input_schema: {
        type: 'object',
        properties: { expression: { type: 'string', description: 'Math expression' } },
        required: ['expression'],
      },
    };
    const { tools, errors } = parse(JSON.stringify(input));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 1) throw new Error(`Expected 1 tool, got ${tools.length}`);
    if (tools[0].name !== 'my_calculator') throw new Error(`Wrong name: ${tools[0].name}`);
    if (tools[0].description !== 'Perform calculations') throw new Error(`Wrong desc: ${tools[0].description}`);
  });

  test('should parse single-tool format with inputSchema key', () => {
    const { tools, errors } = parse(JSON.stringify({
      name: 'my_calculator',
      inputSchema: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: [],
      },
    }));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 1) throw new Error(`Expected 1 tool, got ${tools.length}`);
  });

  test('should return error for invalid JSON', () => {
    const { tools, errors } = parse('not json at all');
    if (tools.length !== 0) throw new Error(`Expected 0 tools, got ${tools.length}`);
    if (errors.length === 0) throw new Error('Expected at least one error');
    if (!errors[0].includes('Invalid JSON')) throw new Error(`Wrong error: ${errors[0]}`);
  });

  test('should return error for unrecognized format', () => {
    const { tools, errors } = parse(JSON.stringify({ foo: 'bar' }));
    if (tools.length !== 0) throw new Error(`Expected 0 tools, got ${tools.length}`);
    if (!errors[0].includes('Unrecognized MCP JSON format')) throw new Error(`Wrong error: ${errors[0]}`);
  });

  test('should handle tools with all primitive types', () => {
    const { tools, errors } = parse(JSON.stringify({
      tools: [
        {
          name: 'multi_type_tool',
          inputSchema: {
            type: 'object',
            properties: {
              strField: { type: 'string' },
              numField: { type: 'number' },
              intField: { type: 'integer' },
              boolField: { type: 'boolean' },
              arrayField: { type: 'array' },
              objField: { type: 'object' },
            },
            required: ['strField', 'numField', 'boolField'],
          },
        },
      ],
    }));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 1) throw new Error(`Expected 1 tool, got ${tools.length}`);
    if (tools[0].name !== 'multi_type_tool') throw new Error(`Wrong name: ${tools[0].name}`);
  });

  test('should return error for tool missing inputSchema', () => {
    const { tools, errors } = parse(JSON.stringify({ name: 'bad_tool', description: 'missing schema' }));
    if (tools.length !== 0) throw new Error(`Expected 0 tools, got ${tools.length}`);
    if (!errors[0].includes('inputSchema')) throw new Error(`Wrong error: ${errors[0]}`);
  });

  test('should handle partial batch failures', () => {
    const { tools, errors } = parse(JSON.stringify({
      tools: [
        { name: 'good_tool', inputSchema: { type: 'object', properties: {}, required: [] } },
        { name: 'bad_tool', description: 'missing schema' },
        { name: 'another_good', inputSchema: { type: 'object', properties: { x: { type: 'number' } }, required: [] } },
      ],
    }));
    if (tools.length !== 2) throw new Error(`Expected 2 tools, got ${tools.length}`);
    if (tools[0].name !== 'good_tool') throw new Error(`Wrong order/name: ${tools[0].name}`);
    if (tools[1].name !== 'another_good') throw new Error(`Wrong order/name: ${tools[1].name}`);
    if (errors.length !== 1) throw new Error(`Expected 1 error, got ${errors.length}`);
    if (!errors[0].includes('bad_tool')) throw new Error(`Wrong error: ${errors[0]}`);
  });

  console.log('\nDynamicMcpToolRegistry');

  test('should register handlers for parsed tools', async () => {
    const { tools } = parse(JSON.stringify({
      tools: [
        {
          name: 'adder',
          description: 'Adds two numbers',
          inputSchema: {
            type: 'object',
            properties: { a: { type: 'number' }, b: { type: 'number' } },
            required: ['a', 'b'],
          },
        },
      ],
    }));
    registerHandler(tools, {
      adder: async (args) => String(args.a + args.b),
    });
    const result = await tools[0].function({ a: 3, b: 5 });
    if (result !== '8') throw new Error(`Expected "8", got "${result}"`);
  });

  test('should create tools with handlers in one step', async () => {
    const json = JSON.stringify({
      name: 'multiplier',
      inputSchema: {
        type: 'object',
        properties: { x: { type: 'number' }, y: { type: 'number' } },
        required: ['x', 'y'],
      },
    });
    const { tools, errors } = createToolsWithHandlers(json, {
      multiplier: async (args) => String(args.x * args.y),
    });
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 1) throw new Error(`Expected 1 tool, got ${tools.length}`);
    const result = await tools[0].function({ x: 4, y: 7 });
    if (result !== '28') throw new Error(`Expected "28", got "${result}"`);
  });

  test('should ignore handlers for non-existent tools', () => {
    const { tools } = parse(JSON.stringify({
      tools: [{ name: 'tool_a', inputSchema: { type: 'object', properties: {}, required: [] } }],
    }));
    // Should not throw
    registerHandler(tools, { tool_b: async () => 'result' });
  });

  console.log('\nReal-world samples');

  test('should parse typical MCP server tools/list response', () => {
    const { tools, errors } = parse(JSON.stringify({
      tools: [
        {
          name: 'tavily_search',
          description: 'Search for information using the Tavily search engine',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'The search query to look up' } },
            required: ['query'],
          },
        },
        {
          name: 'tavily_extract',
          description: 'Extract information from specific URLs',
          inputSchema: {
            type: 'object',
            properties: {
              urls: { type: 'array', items: { type: 'string' }, description: 'List of URLs' },
            },
            required: ['urls'],
          },
        },
      ],
    }));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 2) throw new Error(`Expected 2 tools, got ${tools.length}`);
    if (tools[0].name !== 'tavily_search') throw new Error(`Wrong name: ${tools[0].name}`);
    if (tools[1].name !== 'tavily_extract') throw new Error(`Wrong name: ${tools[1].name}`);
  });

  test('should parse single tool config from MCP provider docs', () => {
    const { tools, errors } = parse(JSON.stringify({
      name: 'filesystem',
      description: 'Read and write files to the local filesystem',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path'],
      },
    }));
    if (errors.length !== 0) throw new Error(errors.join('; '));
    if (tools.length !== 1) throw new Error(`Expected 1 tool, got ${tools.length}`);
    if (tools[0].name !== 'filesystem') throw new Error(`Wrong name: ${tools[0].name}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run();
