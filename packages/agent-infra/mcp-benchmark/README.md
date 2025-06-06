# MCP Benchmarks

MCP Servers benchmark with different transports and http-proxy

## Benchmark

### Different Transports

InMemoryTransport is the fastest communication.

```bash
 ✓ benchmarks/browser_server.bench.ts > Transport Benchmark 4058ms
     name                           hz     min      max    mean     p75     p99    p995     p999     rme  samples
   · StdioTransport             6.7738  137.91   171.09  147.63  153.30  171.09  171.09   171.09  ±4.98%       10   slowest
   · SSETransport               607.91  1.1195  12.3305  1.6450  1.7142  3.0296  4.4099  12.3305  ±4.89%      309
   · StreamableHTTPTransport    744.00  0.9792   2.5887  1.3441  1.4622  2.4611  2.5009   2.5887  ±2.13%      372
   · InMemoryTransport        4,539.43  0.1513   3.3256  0.2203  0.1890  1.1772  1.2731   1.6463  ±3.60%     2270   fastest
```

### Proxy Servers with SSE and Streamable HTTP

- [mcp-proxy Python](https://github.com/sparfenyuk/mcp-proxy)
- [mcp-proxy TypeScript](https://github.com/punkpeye/mcp-proxy)
- [Supergateway](https://github.com/supercorp-ai/supergateway)
- [mcp-http-server](https://www.npmjs.com/package/mcp-http-server)

mcp-http-server >= mcp-proxy TypeScript > Supergateway > mcp-proxy Python

```bash
 ✓ benchmarks/browser_server.bench.ts > Proxy Benchmark 4306ms
     name                           hz     min      max    mean     p75      p99     p995     p999      rme  samples
   · supergateway sse           449.81  1.4396  12.5478  2.2232  2.3619   6.2867   7.2325  12.5478   ±5.58%      225
   · mcp-proxy(Python) sse      291.44  3.1123   4.0633  3.4312  3.5483   4.0451   4.0633   4.0633   ±0.84%      146
   · mcp-proxy(Python) mcp      195.35  4.1453  21.5062  5.1190  5.0493  21.5062  21.5062  21.5062   ±7.79%       98   slowest
   · mcp-proxy(TypeScript) sse  590.75  1.1104  28.2530  1.6928  1.6472   3.7497   4.3387  28.2530  ±10.92%      296
   · mcp-proxy(TypeScript) mcp  722.24  1.0209   6.3759  1.3846  1.3531   3.9764   5.7205   6.3759   ±4.19%      362
   · mcp-http-server mcp        826.70  0.8496   2.9232  1.2096  1.2452   2.5352   2.6592   2.9232   ±2.64%      414
   · mcp-http-server sse        941.06  0.7817   2.4350  1.0626  1.0510   2.0172   2.0609   2.4350   ±2.34%      471   fastest
```

## Development

```
git clone git@github.com:bytedance/UI-TARS-desktop.git
cd UI-TARS-desktop/packages/agent-infra/mcp-benchmark
pnpm i
pnpm run dev
```

![](https://github.com/user-attachments/assets/8fe4c41c-ea2a-45f3-930a-5abd7f058b67)
