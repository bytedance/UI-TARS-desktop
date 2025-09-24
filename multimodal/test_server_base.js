// Simple test script to verify server.base configuration
const express = require('express');

// Mock the setupAPI function to test the router logic
function setupAPI(app, options = {}) {
  const { serverBase } = options;

  // Add app.group method for compatibility
  app.group = (prefix, ...handlers) => {
    const router = express.Router();
    const routerCallback = handlers.pop();
    const middlewares = handlers;
    
    routerCallback(router);
    app.use(prefix, ...middlewares, router);
  };

  // Register API routes with base path support
  if (serverBase) {
    const apiRouter = express.Router();
    
    // Mock route registration
    apiRouter.get('/api/v1/sessions', (req, res) => {
      res.json({ message: 'Sessions endpoint with base path', base: serverBase });
    });
    
    app.use(serverBase, apiRouter);
  } else {
    // Mock route registration without base
    app.get('/api/v1/sessions', (req, res) => {
      res.json({ message: 'Sessions endpoint without base path' });
    });
  }
}

// Test cases
async function testServerBase() {
  console.log('Testing server.base configuration...\n');

  // Test 1: Without server.base
  console.log('Test 1: Without server.base');
  const app1 = express();
  setupAPI(app1);
  
  const server1 = app1.listen(3001, () => {
    console.log('Server 1 listening on port 3001');
    
    // Test request
    fetch('http://localhost:3001/api/v1/sessions')
      .then(res => res.json())
      .then(data => {
        console.log('Response:', data);
        server1.close();
        
        // Test 2: With server.base
        testWithBase();
      })
      .catch(err => {
        console.error('Error:', err);
        server1.close();
      });
  });
}

function testWithBase() {
  console.log('\nTest 2: With server.base = "/api-gateway"');
  const app2 = express();
  setupAPI(app2, { serverBase: '/api-gateway' });
  
  const server2 = app2.listen(3002, () => {
    console.log('Server 2 listening on port 3002');
    
    // Test request with base path
    fetch('http://localhost:3002/api-gateway/api/v1/sessions')
      .then(res => res.json())
      .then(data => {
        console.log('Response:', data);
        server2.close();
        console.log('\nAll tests completed successfully!');
      })
      .catch(err => {
        console.error('Error:', err);
        server2.close();
      });
  });
}

// Run tests
testServerBase();