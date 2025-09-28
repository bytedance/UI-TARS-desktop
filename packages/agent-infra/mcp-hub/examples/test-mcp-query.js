#!/usr/bin/env node

/**
 * MCP Query Examples
 * This demonstrates how to query the MCP marketplace using URL parameters
 */

console.log('MCP Query API Examples');
console.log('======================\n');

console.log('The /mcp endpoint now supports URL query parameters for marketplace search:\n');

console.log('Available Query Parameters:');
console.log('---------------------------');
console.log('• search     - Search by name, description, or tags');
console.log('• category   - Filter by category');
console.log('• tags       - Filter by tags (comma-separated)');
console.log('• sort       - Sort results (newest, stars, name)');
console.log('• limit      - Limit number of results');
console.log('• info       - Get detailed info about a specific server');
console.log('• categories - List all available categories');
console.log('• alltags    - List all available tags\n');

console.log('Example Queries:');
console.log('----------------\n');

console.log('1. Search for database servers:');
console.log('   GET /mcp?search=database\n');

console.log('2. Filter by category and tags:');
console.log('   GET /mcp?category=data&tags=sql,postgres\n');

console.log('3. Get top 10 servers sorted by popularity:');
console.log('   GET /mcp?sort=stars&limit=10\n');

console.log('4. Get detailed info about a specific server:');
console.log('   GET /mcp?info=github-mcp\n');

console.log('5. List all categories:');
console.log('   GET /mcp?categories\n');

console.log('6. List all tags:');
console.log('   GET /mcp?alltags\n');

console.log('7. Complex query:');
console.log('   GET /mcp?search=api&category=integration&sort=newest&limit=5\n');

console.log('Usage with curl:');
console.log('----------------');
console.log('curl "http://localhost:3000/mcp?search=database"');
console.log('curl "http://localhost:3000/mcp?category=data&tags=sql,postgres"');
console.log('curl "http://localhost:3000/mcp?sort=stars&limit=10"\n');

console.log('Response Format:');
console.log('----------------');
console.log(JSON.stringify({
  total: 10,
  servers: [
    {
      id: "example-server",
      name: "Example Server",
      description: "Server description",
      category: "category",
      tags: ["tag1", "tag2"],
      stars: 100,
      author: "author",
      url: "https://github.com/..."
    }
  ],
  timestamp: "2024-02-20T05:55:00.000Z"
}, null, 2));

console.log('\nTo test:');
console.log('1. Start MCP Hub: mcp-hub --port 3000');
console.log('2. Run the test script: ./examples/test-mcp-query-params.sh');
console.log('3. Or use curl/fetch to query the endpoint directly\n');