# Deploying Agent TARS Web to Vercel

## One-Click Deployment

### Using Git Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Agent TARS Web replica"
   git push origin main
   ```

2. **Import on Vercel**
   - Visit https://vercel.com/new
   - Select "Import Git Repository"
   - Search for your repo
   - Click "Import"

3. **Configure Environment Variables**
   - Go to Settings > Environment Variables
   - Add the following:
     ```
     OPENAI_API_KEY=sk_your_key_here
     OPENAI_API_BASE_URL=https://api.openai.com/v1
     OPENAI_MODEL=gpt-4-turbo
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access your app at the provided Vercel URL

## CLI Deployment

### Prerequisites
```bash
npm install -g vercel
vercel login
```

### Deploy Command
```bash
cd apps/agent-tars-web
vercel --prod
```

### With Environment Variables
```bash
vercel --prod \
  --env OPENAI_API_KEY=sk_xxx \
  --env OPENAI_API_BASE_URL=https://api.openai.com/v1 \
  --env OPENAI_MODEL=gpt-4-turbo
```

## Configuration Files

### vercel.json
Create this in the app root to customize deployment:

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev --turbopack",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "OPENAI_API_KEY": "@openai_api_key",
    "OPENAI_API_BASE_URL": {
      "value": "https://api.openai.com/v1",
      "default": "https://api.openai.com/v1"
    },
    "OPENAI_MODEL": {
      "value": "gpt-4-turbo",
      "default": "gpt-4-turbo"
    }
  }
}
```

## Environment Variables

Set these in Vercel dashboard or via CLI:

| Variable | Value | Required |
|----------|-------|----------|
| OPENAI_API_KEY | sk_... | Yes |
| OPENAI_API_BASE_URL | https://api.openai.com/v1 | No |
| OPENAI_MODEL | gpt-4-turbo | No |
| NODE_ENV | production | No |

## Custom Domain

1. **Add Domain**
   - Go to Project Settings > Domains
   - Click "Add Domain"
   - Enter your custom domain

2. **Update DNS**
   - Update your DNS provider with Vercel's nameservers
   - Or use CNAME record

3. **SSL Certificate**
   - Automatically provisioned by Vercel
   - Takes ~5 minutes

## Advanced Configuration

### Monorepo Setup

If deploying from monorepo root, create `vercel.json`:

```json
{
  "buildCommand": "cd apps/agent-tars-web && npm run build",
  "outputDirectory": "apps/agent-tars-web/.next",
  "rootDirectory": "apps/agent-tars-web"
}
```

### Regional Deployment

```bash
# Deploy to specific region
vercel --prod --regions sfo1 lhr1 hnd1
```

Regions:
- `iad1` - US East (Virginia)
- `sfo1` - US West (California)
- `lhr1` - Europe (London)
- `hnd1` - Asia (Tokyo)
- `syd1` - Australia (Sydney)

### Deployment Preview

Every pull request creates a preview:
- Automatic preview deployments
- Share preview links
- Test before merging

### Rollback

To rollback to a previous deployment:

```bash
vercel ls                          # List deployments
vercel promote <DEPLOYMENT_ID>     # Promote to production
```

## Performance Optimization

### Image Optimization
Already configured in next.config.ts

### Caching Strategy
```typescript
// app/api/route.ts
export const revalidate = 60 // ISR: revalidate every 60 seconds
```

### Analytics
Enable Vercel Web Analytics:
1. Go to Project Settings > Analytics
2. Click "Enable Web Analytics"

## Monitoring

### Error Tracking
- Vercel automatically captures errors
- View in Deployments > Function Logs
- Export to Sentry for advanced tracking

### Performance Monitoring
- Built-in Web Vitals
- Real User Monitoring (RUM)
- Performance Insights in dashboard

## Troubleshooting

### Build Fails
```bash
# Check build logs
vercel logs --follow

# Common fixes:
# 1. Ensure all dependencies are in package.json
# 2. Check Node.js version compatibility
# 3. Verify env vars are set
```

### Deployment Takes Too Long
```bash
# Check build duration in logs
# Common optimizations:
# 1. Split large components
# 2. Optimize imports
# 3. Reduce bundle size
```

### Environment Variables Not Working
```bash
# Verify in Vercel dashboard:
# Settings > Environment Variables
# Ensure variables match names exactly
# Redeploy after adding variables
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

## Security

### Secrets Management
- Never commit API keys
- Use Vercel's environment variables
- Rotate keys regularly
- Use separate keys for dev/prod

### CSP Headers
```typescript
// next.config.ts
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "script-src 'self' 'unsafe-inline'"
  }
]
```

## Cost Optimization

- **Serverless Functions**: Auto-scale, pay per use
- **Edge Functions**: Lower latency, minimal cost
- **Caching**: Reduce function invocations
- **Images**: Automatic optimization

## Support

- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/next.js
- Support: https://vercel.com/support

## Next Steps

1. Create Vercel account: https://vercel.com
2. Install Vercel CLI: `npm i -g vercel`
3. Run: `vercel --prod`
4. Add your OPENAI_API_KEY
5. Deploy!

Your Agent TARS Web will be live within minutes!
