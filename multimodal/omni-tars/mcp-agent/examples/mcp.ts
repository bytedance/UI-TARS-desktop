
import { MCPClient } from '@agent-infra/mcp-client';

async function main() {
    const client = new MCPClient([
        {
            type: 'streamable-http',
            name: 'link-reader',
            description: 'Crawl, parse and summarize for web pages',
            url: process.env.LINK_READER_URL,
            headers: {
                'x-text-browser-ak': process.env.LINK_READER_AK,
                'x-text-browser-traffic-id': 'edge_agent_research',
                'x-text-browser-traffic-group': 'Seed_Edge',
            },
            timeout: 60,
        },
    ]);

    await client.init();

    const tools = await client.listTools();

    console.log('tools: ', tools);
}

main();