# Logging & Monitoring

This application uses structured logging with `pino` for comprehensive request tracking, performance monitoring, and debugging.

## Log Levels

Set via `LOG_LEVEL` environment variable (default: `info`):
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (recommended for production)
- `debug` - Detailed debugging information
- `trace` - Very detailed tracing

## Development vs Production

**Development** (pretty-printed, colorized):
```bash
npm start
# or
NODE_ENV=development npm start
```

**Production** (JSON format for log aggregation):
```bash
NODE_ENV=production npm start
```

## What Gets Logged

### Server Startup
- Port number
- Database path
- Number of MCP tools
- Environment and log level

### Every HTTP Request
- **Request ID** - Unique identifier for tracking
- Method and path
- Query parameters
- Client IP address
- **Duration** - Time to complete request
- Status code

### Chat Endpoint (`/chat`)
- Message length and conversation history size
- **Claude API performance**:
  - Duration of API call
  - Token usage (input/output)
  - Stop reason
- **Tool execution**:
  - Tool name and input parameters
  - Execution duration
  - Result size
  - Errors with stack traces

### REST API Endpoints
- Todo operations (create, update, delete, fetch)
- Filter parameters
- Result counts
- Validation errors

### Error Tracking
All errors include:
- Error message
- Stack trace
- Error type
- Request ID (for correlation)

## Viewing Logs

### Local Development
Logs appear in the console with color coding and timestamps.

### Fly.io Production
```bash
# Stream live logs
flyctl logs -a mcp-todo

# Filter by level
flyctl logs -a mcp-todo | grep ERROR

# Save logs to file
flyctl logs -a mcp-todo -n > logs.txt
```

### Docker
```bash
# View logs
docker logs mcp-todo

# Follow logs
docker logs -f mcp-todo

# Last 100 lines
docker logs --tail 100 mcp-todo
```

## Request ID Correlation

Every request gets a unique ID that appears in all related log entries. Use this to track a single request through the system:

```bash
# Find all logs for a specific request
flyctl logs -a mcp-todo | grep "req_1762802885248_m55y8kjjs"
```

Error responses include the request ID:
```json
{
  "error": "Failed to process message",
  "details": "...",
  "requestId": "req_1762802885248_m55y8kjjs"
}
```

## Performance Monitoring

Key metrics logged:
- **Total request duration** - End-to-end time
- **Claude API duration** - Time spent calling Claude
- **Tool execution duration** - Time to execute each MCP tool
- **Token usage** - Input and output tokens per Claude call

Example from logs:
```
Claude API call completed
  claudeDuration: "2802ms"
  inputTokens: 1256
  outputTokens: 54

Tool execution successful
  toolName: "create_todo"
  toolDuration: "7ms"
  resultSize: 257

Request completed
  duration: "6640ms"
```

## Adding Custom Logging

In your code, use the request logger:

```javascript
// In endpoint handlers
req.log.info({ userId: '123' }, 'User action');
req.log.error({ error: err }, 'Operation failed');

// For background tasks, use the base logger
import logger from './logger.js';
logger.info({ event: 'cleanup' }, 'Database cleanup started');
```

## Log Analysis Tips

1. **Find slow requests**:
   ```bash
   flyctl logs -a mcp-todo -n | grep "duration" | grep -v "ms\"$" | grep "[0-9]{4,}ms"
   ```

2. **Count errors**:
   ```bash
   flyctl logs -a mcp-todo -n | grep -c "ERROR"
   ```

3. **Monitor token usage**:
   ```bash
   flyctl logs -a mcp-todo | grep "inputTokens"
   ```

4. **Track tool usage**:
   ```bash
   flyctl logs -a mcp-todo | grep "Executing MCP tool"
   ```

## Future Enhancements

Consider adding:
- **Sentry** - For error tracking with alerts
- **Grafana/Prometheus** - For metrics visualization
- **Log aggregation** - Send logs to Datadog, LogDNA, or similar
- **Alerts** - Notify on errors or performance degradation
