const http = require('http');
const fs = require('fs');
const path = require('path');

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
      <!DOCTYPE html>
      <html>
      <head>
        <title>BasePath Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          a { display: block; margin: 10px 0; padding: 10px; background: #f0f0f0; text-decoration: none; border-radius: 4px; }
          a:hover { background: #e0e0e0; }
        </style>
      </head>
      <body>
        <h1>🧪 BasePath Test Server</h1>
        <p>点击以下链接测试不同的 basePath 场景：</p>
        
        <h2>Static BasePath Tests</h2>
        <a href="/foo">📁 /foo (exact match)</a>
        <a href="/foo/chat">💬 /foo/chat (sub-path)</a>
        <a href="/foo/workspace">🛠️ /foo/workspace (sub-path)</a>
        <a href="/foo/settings/profile">⚙️ /foo/settings/profile (deep path)</a>
        
        <h2>Regex BasePath Tests</h2>
        <a href="/tenant-abc">🏢 /tenant-abc (regex: /tenant-.+)</a>
        <a href="/tenant-xyz/dashboard">📊 /tenant-xyz/dashboard (regex sub-path)</a>
        <a href="/tenant-123/settings">⚙️ /tenant-123/settings (regex sub-path)</a>
        
        <h2>Non-matching Tests</h2>
        <a href="/bar">❌ /bar (should not match /foo)</a>
        <a href="/other/path">❌ /other/path (should not match)</a>
      </body>
      </html>
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
  
  // 其他路径返回 404，模拟不匹配 basePath 的情况
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - Path Not Found</title></head>
    <body style="font-family: Arial; text-align: center; margin-top: 100px;">
      <h1>❌ 404 - Path Not Found</h1>
      <p>Path <code>${req.url}</code> does not match any configured basePath.</p>
      <a href="/">← Back to Home</a>
    </body>
    </html>
  `);
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 BasePath test server running at http://localhost:${PORT}`);
  console.log(`\n📋 Quick Test URLs:`);
  console.log(`   http://localhost:${PORT}/foo`);
  console.log(`   http://localhost:${PORT}/foo/chat`);
  console.log(`   http://localhost:${PORT}/tenant-abc`);
  console.log(`   http://localhost:${PORT}/tenant-xyz/dashboard`);
  console.log(`\n🔍 Open your browser and test the basePath routing!`);
});