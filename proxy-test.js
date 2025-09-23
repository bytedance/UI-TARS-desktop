const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

// 创建代理
const proxy = httpProxy.createProxyServer({});

// 创建服务器
const server = http.createServer((req, res) => {
  console.log(`📝 ${req.method} ${req.url}`);
  
  // 处理 /foo 路径下的请求
  if (req.url === '/foo' || req.url.startsWith('/foo/')) {
    // 读取测试页面
    const htmlPath = path.join(__dirname, 'test-basepath.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('Test page not found');
    }
    return;
  }
  
  // 处理根路径
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>BasePath Test Server</h1>
      <p>访问以下链接测试：</p>
      <ul>
        <li><a href="/foo">Static BasePath: /foo</a></li>
        <li><a href="/foo/chat">Sub-path: /foo/chat</a></li>
        <li><a href="/foo/workspace">Sub-path: /foo/workspace</a></li>
        <li><a href="/tenant-abc">Regex test: /tenant-abc</a></li>
        <li><a href="/tenant-xyz/dashboard">Regex test: /tenant-xyz/dashboard</a></li>
      </ul>
    `);
    return;
  }
  
  // 处理 /tenant-* 路径（模拟正则匹配）
  if (req.url.match(/^\/tenant-.+/)) {
    const html = fs.readFileSync(path.join(__dirname, 'test-basepath.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  
  // 其他路径返回 404
  res.writeHead(404);
  res.end('Path not handled by basePath routing');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 BasePath test server running at http://localhost:${PORT}`);
  console.log(`📋 Test URLs:`);
  console.log(`   http://localhost:${PORT}/foo`);
  console.log(`   http://localhost:${PORT}/foo/chat`);
  console.log(`   http://localhost:${PORT}/tenant-abc`);
  console.log(`   http://localhost:${PORT}/tenant-xyz/dashboard`);
});
