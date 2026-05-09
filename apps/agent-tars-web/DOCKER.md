# Agent TARS Web Docker Setup

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API key

### Build and Run

```bash
# 1. Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk_your_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo
BROWSER_HEADLESS=true
EOF

# 2. Build and run with Docker Compose
docker-compose up -d

# 3. Access the application
# Open http://localhost:3000 in your browser

# 4. View logs
docker-compose logs -f agent-tars-web
```

### Stop the Application

```bash
docker-compose down
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

## Docker Configuration Details

### Environment Variables

Pass environment variables through the `.env` file or docker-compose:

```bash
# In .env file
OPENAI_API_KEY=sk_xxx
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

Or via command line:

```bash
docker run -e OPENAI_API_KEY=sk_xxx agent-tars-web
```

### Ports

- **3000**: Web application (default)
- **5432**: PostgreSQL (if enabled, optional)

### Volumes

- Application code is baked into the image
- Optional: Mount `/app/public` for custom assets
- Optional: Mount `/app/.next/static` for custom styles

## Production Deployment

### 1. Build and Push to Registry

```bash
docker build -t your-registry/agent-tars-web:latest .
docker push your-registry/agent-tars-web:latest
```

### 2. Deploy to Cloud

**Vercel:**
```bash
vercel deploy --prod
```

**AWS ECS:**
```bash
# Push to ECR and deploy via ECS console
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag agent-tars-web:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-tars-web:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-tars-web:latest
```

**DigitalOcean App Platform:**
```bash
doctl apps create --spec app.yaml
```

**Render:**
```bash
# Connect GitHub repo and deploy via Render dashboard
# Or use render.yaml config file
```

### 3. Set Environment Variables

In your cloud provider's dashboard:
- `OPENAI_API_KEY`
- `OPENAI_API_BASE_URL`
- `OPENAI_MODEL`
- Other configuration as needed

## Docker Best Practices

### Security
- Use secrets management for API keys
- Don't commit .env files
- Update base images regularly
- Run as non-root user (nextjs)

### Performance
- Use multi-stage builds (already in Dockerfile)
- Cache layers efficiently
- Minimize image size
- Use Alpine Linux base

### Monitoring
- Enable health checks
- Monitor logs
- Set up error tracking
- Use container orchestration

## Troubleshooting

### Container won't start
```bash
docker-compose logs agent-tars-web
```

### Port already in use
```bash
# Change port in docker-compose.yml
# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

### API key not working
- Verify key is set in .env
- Check format is correct (sk_...)
- Ensure API key has sufficient permissions
- Check rate limits

### Build fails
```bash
# Clean and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

## Advanced Configuration

### Custom Network

```yaml
networks:
  agent-network:
    driver: bridge

services:
  agent-tars-web:
    networks:
      - agent-network
```

### Resource Limits

```yaml
services:
  agent-tars-web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Reverse Proxy (Nginx)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - agent-tars-web
```

## Next Steps

1. Ensure Docker is installed: `docker --version`
2. Create `.env` file with your API keys
3. Run: `docker-compose up -d`
4. Access: http://localhost:3000
5. For production, push image to your registry
