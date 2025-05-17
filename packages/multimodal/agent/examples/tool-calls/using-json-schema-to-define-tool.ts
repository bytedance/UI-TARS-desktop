/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic tool call, using `JSON Schema` to describe the
 * tool parameters.
 */

import { Agent, Tool } from '../../src';

const locationTool = new Tool({
  id: 'getCurrentLocation',
  description: "Get user's current location",
  parameters: {},
  function: async () => {
    return { location: 'Boston' };
  },
});

const weatherTool = new Tool({
  id: 'getWeather',
  description: 'Get weather information for a specified location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Location name, such as city name',
      },
    },
    required: ['location'],
  },
  function: async (input) => {
    const { location } = input;
    return {
      location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  },
});

const agent = new Agent({
  tools: [locationTool, weatherTool],
});

async function main() {
  const answer = await agent.run("How's the weather today?");
  console.log(answer);
}

main();
