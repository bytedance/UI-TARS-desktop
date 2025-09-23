const express = require('express');
const path = require('path');
const fs = require('fs');

// 导入我们的 webui-routing 函数
const { createPathMatcher, extractActualBasename } = require('./multimodal/tarko/shared-utils/dist/webui-routing.js');

const app = express();
const PORT = 3001;

// 静态文件路径
const staticPath = path.join(__dirname, 'multimodal/tarko/agent-ui-builder/static');

console.log('Static path:', staticPath);
console.log('Static path exists:', fs.existsSync(staticPath));

// 测试配置
const testConfigs = [
  {
    name: 'Static BasePath',
    basePath: '/foo',
    description: 'Static path /foo'
  },
  {
    name: 'Regex BasePath - Tenant',
    basePath: '/tenant-.+',
    description: 'Regex pattern /tenant-.+ for multi-tenant'
  },
  {
    name: 'Regex BasePath - Environment',
    basePath: '/(dev|staging|prod)/app',
    description: 'Regex pattern for environment-specific deployments'
  },
  {
    name: 'No BasePath',
    basePath: undefined,
    description: 'No basePath (should match all paths)'
  }
];

// 为每个配置创建路由
testConfigs.forEach((config, index) => {
  console.log(`Setting up test ${index + 1}: ${config.name}`);
  
  if (!config.basePath) {
    // 无 basePath 的情况，在根路径提供
    app.use('/', (req, res, next) => {
      if (req.path === '/' || req.path === '/index.html') {
        return setupUI(req, res, config);
      }
      next();
    });
    return;
  }

  const pathMatcher = createPathMatcher(config.basePath);
  
  // 设置路由处理
  app.get('*', (req, res, next) => {
    if (!pathMatcher.test(req.path)) {
      return next();
    }

    console.log(`✅ Path ${req.path} matches basePath ${config.basePath}`);
    setupUI(req, res, config);
  });
});

// 设置 UI 的函数
function setupUI(req, res, config) {
  const pathMatcher = createPathMatcher(config.basePath);
  
  // 检查是否是 HTML 请求
  if (req.path.endsWith('.html') || req.path === '/' || req.path.match(/^\/[^.]*$/)) {
    const indexPath = path.join(staticPath, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      return res.status(404).send('index.html not found');
    }
    
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // 注入配置
    const scriptTag = `<script>
      window.AGENT_BASE_URL = "";
      window.AGENT_WEB_UI_CONFIG = {
        basePath: "${config.basePath || ''}",
        title: "BasePath Test - ${config.name}",
        subtitle: "${config.description}"
      };
      window.TEST_CONFIG = ${JSON.stringify(config)};
      console.log("🧪 Test Config:", window.TEST_CONFIG);
      console.log("📍 Current Path:", window.location.pathname);
      console.log("🔍 Extracted Basename:", "${config.basePath ? extractActualBasename(config.basePath, req.path) : ''}");
    </script>`;
    
    htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);
    return res.send(htmlContent);
  }
  
  // 处理静态文件
  const extractedPath = pathMatcher.extract(req.path);
  const filePath = path.join(staticPath, extractedPath);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // SPA 回退
  if (req.method === 'GET' && !extractedPath.includes('.')) {
    const indexPath = path.join(staticPath, 'index.html');
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    const scriptTag = `<script>
      window.AGENT_BASE_URL = "";
      window.AGENT_WEB_UI_CONFIG = {
        basePath: "${config.basePath || ''}",
        title: "BasePath Test - ${config.name}",
        subtitle: "${config.description}"
      };
      window.TEST_CONFIG = ${JSON.stringify(config)};
    </script>`;
    
    htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);
    return res.send(htmlContent);
  }
  
  res.status(404).send('File not found');
}

// 添加首页，显示所有测试链接
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BasePath Test Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .test-card { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .test-link { display: inline-block; margin: 5px; padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .test-link:hover { background: #0056b3; }
        .description { color: #666; margin: 10px 0; }
        .pattern { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>🧪 BasePath Routing Tests</h1>
      <p>点击下面的链接测试不同的 basePath 配置：</p>
      
      <div class="test-card">
        <h3>1. Static BasePath: <span class="pattern">/foo</span></h3>
        <div class="description">测试静态路径匹配</div>
        <a href="/foo" class="test-link">📁 /foo</a>
        <a href="/foo/chat" class="test-link">💬 /foo/chat</a>
        <a href="/foo/workspace" class="test-link">🛠️ /foo/workspace</a>
      </div>
      
      <div class="test-card">
        <h3>2. Regex BasePath: <span class="pattern">/tenant-.+</span></h3>
        <div class="description">测试正则表达式路径匹配（多租户场景）</div>
        <a href="/tenant-abc" class="test-link">🏢 /tenant-abc</a>
        <a href="/tenant-xyz/dashboard" class="test-link">📊 /tenant-xyz/dashboard</a>
        <a href="/tenant-123/settings" class="test-link">⚙️ /tenant-123/settings</a>
      </div>
      
      <div class="test-card">
        <h3>3. Complex Regex: <span class="pattern">/(dev|staging|prod)/app</span></h3>
        <div class="description">测试复杂正则表达式（环境特定部署）</div>
        <a href="/dev/app" class="test-link">🔧 /dev/app</a>
        <a href="/staging/app/test" class="test-link">🧪 /staging/app/test</a>
        <a href="/prod/app/dashboard" class="test-link">🚀 /prod/app/dashboard</a>
      </div>
      
      <div class="test-card">
        <h3>4. 负面测试（应该显示 404）</h3>
        <div class="description">这些路径不应该匹配任何 basePath</div>
        <a href="/bar" class="test-link" style="background: #dc3545;">❌ /bar</a>
        <a href="/other/path" class="test-link" style="background: #dc3545;">❌ /other/path</a>
        <a href="/tenant" class="test-link" style="background: #dc3545;">❌ /tenant (不完整)</a>
      </div>
      
      <hr>
      <p><strong>说明：</strong></p>
      <ul>
        <li>每个成功的链接都会加载 Agent UI，并在控制台显示路径匹配信息</li>
        <li>查看浏览器开发者工具的控制台可以看到详细的路径解析过程</li>
        <li>红色链接应该显示 404 错误，表示路径不匹配</li>
      </ul>
    </body>
    </html>
  `);
});

// 404 处理
app.use((req, res) => {
  console.log(`❌ Path ${req.path} does not match any basePath`);
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - BasePath Not Matched</title></head>
    <body style="font-family: Arial; text-align: center; margin-top: 100px;">
      <h1 style="color: #dc3545;">❌ 404 - BasePath Not Matched</h1>
      <p>Path <code style="background: #f8f9fa; padding: 2px 6px;">${req.path}</code> does not match any configured basePath</p>
      <a href="/" style="color: #007bff;">← Back to Test Dashboard</a>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 BasePath test server running at http://localhost:${PORT}`);
  console.log(`📋 Test the following scenarios:`);
  console.log(`   Static:     http://localhost:${PORT}/foo`);
  console.log(`   Regex:      http://localhost:${PORT}/tenant-abc`);
  console.log(`   Complex:    http://localhost:${PORT}/dev/app`);
  console.log(`   Dashboard:  http://localhost:${PORT}`);
});