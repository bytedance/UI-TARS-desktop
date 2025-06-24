#!/usr/bin/env node
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-check

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';

// NOTE: Can be removed when we drop Node.js 18 support and changed to import.meta.filename.
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format tool information as table row
 * @param {Object} tool - Tool definition from MCP
 * @returns {string} Table row
 */
function formatToolForTable(tool) {
  const name = tool.name;
  const description = tool.description || '';

  // Handle parameters
  let parameters = 'None';

  if (tool.inputSchema && tool.inputSchema.properties) {
    const requiredParams = tool.inputSchema.required || [];
    const paramList = Object.entries(tool.inputSchema.properties).map(
      ([name, param]) => {
        const optional = !requiredParams.includes(name);
        const paramObj = param as { type?: string; description?: string };
        const type = paramObj.type || 'unknown';
        const desc = paramObj.description || '';
        return `**${name}** (${type}${optional ? ', optional' : ', required'}): ${desc}`;
      },
    );
    parameters = paramList.join('<br/>');
  }

  return `| \`${name}\` | ${description} | ${parameters} |`;
}

/**
 * Format resource information as table row
 * @param {Object} resource - Resource definition from MCP
 * @returns {string} Table row
 */
function formatResourceForTable(resource) {
  const name = resource.name;
  const uri = resource.uri;
  const description = resource.description || '';
  const mimeType = resource.mimeType || 'application/octet-stream';

  return `| ${name} | \`${uri}\` | ${description} | ${mimeType} |`;
}

/**
 * Get all tools and resources from MCP server
 * @returns {Promise<{tools: Array, resources: Array}>} Tools and resources
 */
async function getToolsAndResources() {
  const client = new Client(
    {
      name: 'documentation-generator',
      version: '1.0',
    },
    {
      capabilities: {
        roots: {
          listChanged: true,
        },
      },
    },
  );

  // Create servers with and without vision to get all tools
  const server = createServer({
    launchOptions: {
      headless: true,
    },
    vision: true,
  });

  const allTools = new Map();
  const allResources = new Map();

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  // Get tools
  const toolsResult = await client.listTools();
  toolsResult.tools.forEach((tool) => {
    allTools.set(tool.name, tool);
  });

  // Get resources
  try {
    const resourcesResult = await client.listResources();
    resourcesResult.resources.forEach((resource) => {
      allResources.set(resource.uri, resource);
    });
  } catch (error) {
    console.warn('Could not list resources:', error.message);
  }

  // Get resource templates
  try {
    const resourceTemplatesResult = await client.listResourceTemplates();
    console.log(
      `Found ${resourceTemplatesResult.resourceTemplates.length} resource templates`,
    );
    resourceTemplatesResult.resourceTemplates.forEach((template) => {
      console.log(`Template: ${template.name} - ${template.uriTemplate}`);
      allResources.set(template.uriTemplate, {
        name: template.name,
        uri: template.uriTemplate,
        description: template.description || '',
        mimeType:
          template.mimeType ||
          'Automatic identification based on file extension',
      });
    });
  } catch (error) {
    console.warn('Could not list resource templates:', error.message);
  }

  await client.close();
  return {
    tools: Array.from(allTools.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    resources: Array.from(allResources.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}

/**
 * Update the API section in README
 * @param {string} content - README content
 * @returns {Promise<string>} Updated content
 */
async function updateAPI(content) {
  console.log('Generating API documentation...');

  const { tools, resources } = await getToolsAndResources();

  console.log(`Found ${tools.length} tools`);
  console.log(`Found ${resources.length} resources`);

  const generatedLines: string[] = [];

  // Generate tools table
  generatedLines.push('#### Tools');
  generatedLines.push('');
  generatedLines.push('| Tool Name | Description | Parameters |');
  generatedLines.push('|-----------|-------------|------------|');

  tools.forEach((tool) => {
    generatedLines.push(formatToolForTable(tool));
  });

  generatedLines.push('');

  // Generate resources table
  generatedLines.push('#### Resources');
  generatedLines.push('');
  generatedLines.push(
    '| Resource Name | URI Pattern | Description | MIME Type |',
  );
  generatedLines.push(
    '|---------------|-------------|-------------|-----------|',
  );

  resources.forEach((resource) => {
    generatedLines.push(formatResourceForTable(resource));
  });

  const startMarker = `<!--- API generated by update-readme.js -->`;
  const endMarker = `<!--- End of API generated section -->`;

  const startMarkerIndex = content.indexOf(startMarker);
  const endMarkerIndex = content.indexOf(endMarker);

  if (startMarkerIndex === -1 || endMarkerIndex === -1) {
    throw new Error('Markers for generated section not found in README');
  }

  return [
    content.slice(0, startMarkerIndex + startMarker.length),
    '',
    '### API',
    '',
    generatedLines.join('\n'),
    '',
    content.slice(endMarkerIndex),
  ].join('\n');
}

async function updateReadme() {
  try {
    const readmePath = path.join(__dirname, '..', 'README.md');
    console.log(`Updating README: ${readmePath}`);

    const readmeContent = await fs.promises.readFile(readmePath, 'utf-8');
    const updatedContent = await updateAPI(readmeContent);

    await fs.promises.writeFile(readmePath, updatedContent, 'utf-8');
    console.log('README updated successfully!');
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

updateReadme();
