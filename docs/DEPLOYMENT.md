# Deployment Guide

## Fly.io Deployment

### Prerequisites

1. **Fly.io CLI installed**
   ```bash
   brew install flyctl
   ```

2. **Fly.io account**
   ```bash
   fly auth login
   ```

3. **Anthropic API key**

### Initial Setup

#### 1. Create the App

The app is already configured via `fly.toml`:

```bash
fly launch --no-deploy --copy-config
```

This uses the existing configuration:
- App name: `mcp-todo`
- Region: San Jose (SJC)
- 1GB RAM, 1 shared CPU
- Auto-scale to zero

#### 2. Create Persistent Volume

SQLite needs persistent storage:

```bash
fly volumes create todo_data --region sjc --size 1 --app mcp-todo --yes
```

Volume details:
- Name: `todo_data`
- Size: 1GB (~$0.15/month)
- Encrypted at rest
- Mounted at `/data` in container

#### 3. Set Environment Variables

```bash
# Database path (matches volume mount)
fly secrets set DB_PATH=/data/todos.db --app mcp-todo

# Server port (matches fly.toml internal_port)
fly secrets set PORT=8080 --app mcp-todo

# Anthropic API key
fly secrets set ANTHROPIC_API_KEY=your-api-key-here --app mcp-todo
```

### Deploying

#### First Deployment

```bash
fly deploy --app mcp-todo
```

Build process:
1. Builds Docker image using Depot (faster than standard Docker)
2. Pushes to Fly.io registry
3. Creates machine with volume mounted
4. Starts application

#### Subsequent Deployments

Make changes, commit, then:

```bash
fly deploy --app mcp-todo
```

The pre-push hook will:
- Update dependencies
- Run all tests
- Block push if tests fail

### Verification

#### Health Check

```bash
curl https://mcp-todo.fly.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "mcpConnected": true,
  "toolsAvailable": 6
}
```

#### View Logs

```bash
fly logs --app mcp-todo
```

Look for:
- `Setting up volume 'todo_data'`
- `Connected to MCP server with 6 tools`
- `Todo web server running on http://localhost:8080`

#### Check Status

```bash
fly status --app mcp-todo
```

Shows:
- Machine state (started/stopped)
- Memory/CPU usage
- Volume attachment

### Local Docker Testing

**Always test locally before deploying to Fly.io.**

#### Build Image

```bash
docker build -t mcp-todo:test .
```

Dockerfile details:
- Base: `node:20-slim`
- Installs: python3, make, g++ (for better-sqlite3)
- Uses: `--ignore-scripts` + `npm rebuild better-sqlite3` to avoid husky in production
- Exposes: port 8080

#### Run Container

```bash
# Create test volume directory
mkdir -p /tmp/docker-test-data

# Run with volume mount
docker run --rm -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e DB_PATH=/data/todos.db \
  -e ANTHROPIC_API_KEY=your-key \
  -v /tmp/docker-test-data:/data \
  --name mcp-todo-test \
  mcp-todo:test
```

#### Test Locally

```bash
# Health check
curl http://localhost:8080/health

# Verify database created
ls -lh /tmp/docker-test-data/

# View logs
docker logs mcp-todo-test

# Stop container
docker stop mcp-todo-test

# Cleanup
rm -rf /tmp/docker-test-data
```

### Monitoring

#### Application Metrics

```bash
fly status --app mcp-todo
```

#### Resource Usage

```bash
fly scale show --app mcp-todo
```

#### Volume Info

```bash
fly volumes list --app mcp-todo
```

### Scaling

#### Memory/CPU

```bash
# Show current configuration
fly scale show --app mcp-todo

# Increase memory to 2GB
fly scale memory 2048 --app mcp-todo

# Change to dedicated CPU
fly scale vm dedicated-cpu-1x --app mcp-todo
```

#### Machine Count

Current config: `min_machines_running = 0` (auto-scale to zero)

To always keep one running:
```toml
# Edit fly.toml
min_machines_running = 1
```

Then deploy:
```bash
fly deploy --app mcp-todo
```

### Troubleshooting

#### Build Failures

Check Dockerfile syntax:
```bash
docker build -t mcp-todo:test .
```

Common issues:
- Missing dependencies in package.json
- Native module compilation (better-sqlite3)
- COPY paths incorrect

#### Deployment Failures

View deployment logs:
```bash
fly logs --app mcp-todo
```

Common issues:
- Missing environment variables
- Volume not mounted
- Port mismatch (ensure PORT=8080)

#### Database Issues

Check volume:
```bash
fly volumes list --app mcp-todo
```

SSH into machine:
```bash
fly ssh console --app mcp-todo
ls -la /data
```

#### Application Crashes

View recent logs:
```bash
fly logs --app mcp-todo
```

Check machine status:
```bash
fly status --app mcp-todo
```

Restart machine:
```bash
fly apps restart mcp-todo
```

### Cost Optimization

Current configuration costs:
- **Compute**: $0 when idle (auto-scale to zero)
- **Storage**: ~$0.15/month for 1GB volume
- **Bandwidth**: Free tier includes generous allowance

Tips:
- Keep `auto_stop_machines = "stop"` in fly.toml
- Set `min_machines_running = 0` for development
- Monitor with `fly status` to verify scaling behavior

### Security

#### Secrets Management

Never commit secrets. Use:
```bash
fly secrets set KEY=value --app mcp-todo
```

View secret names (not values):
```bash
fly secrets list --app mcp-todo
```

#### HTTPS

Fly.io provides automatic HTTPS:
- Certificate provisioned automatically
- HTTP automatically redirects to HTTPS (via `force_https = true`)
- No manual certificate management needed

#### Volume Encryption

All volumes are encrypted at rest by default. No additional configuration needed.

### Backup Strategy

#### Database Backup

SSH into machine and copy database:
```bash
fly ssh console --app mcp-todo
cat /data/todos.db > /tmp/backup.db
exit

# Then use fly sftp to retrieve
```

Or use volume snapshots (5 retained by default).

#### Configuration Backup

All configuration is in git:
- `Dockerfile`
- `fly.toml`
- `.dockerignore`

Secrets must be documented separately (not in git).

### Rollback

#### Previous Deployment

Fly.io keeps deployment history:
```bash
fly releases --app mcp-todo
fly deploy --image registry.fly.io/mcp-todo@sha256:previous-sha
```

#### Volume Snapshots

Restore from snapshot if data corruption:
```bash
fly volumes list --app mcp-todo
fly volumes snapshots list vol_xxx
```

### Production URLs

- **Application**: https://mcp-todo.fly.dev/
- **Health Check**: https://mcp-todo.fly.dev/health
- **Fly.io Dashboard**: https://fly.io/apps/mcp-todo
