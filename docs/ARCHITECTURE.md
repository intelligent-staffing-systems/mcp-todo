# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  public/index.html (Tailwind CSS via CDN)        │  │
│  │  public/app.js (Vanilla JS + localStorage)       │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP POST /chat
                       │ { message, conversationHistory }
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Express Server                       │
│                     (server.js)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Route: POST /chat                                │  │
│  │  - Receives user message + history               │  │
│  │  - Calls Claude API with MCP tools                │  │
│  │  - Handles tool calling loop                      │  │
│  │  - Returns final response + updated history       │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               │ Tool calls           │ stdio
               │                      │
               ▼                      ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│   MCP Client            │  │   MCP Server            │
│   (server.js)           │  │   (index.js)            │
│   - Lists tools         │  │   - Exposes 6 tools     │
│   - Calls tools         │  │   - Wraps TodoService   │
│   - Formats results     │  │   - Validates with Zod  │
└─────────────────────────┘  └───────────┬─────────────┘
                                         │
                                         │ SQL queries
                                         ▼
                             ┌─────────────────────────┐
                             │   TodoService           │
                             │   (todoService.js)      │
                             │   - CRUD operations     │
                             │   - Filtering logic     │
                             │   - Business rules      │
                             └───────────┬─────────────┘
                                         │
                                         │ better-sqlite3
                                         ▼
                             ┌─────────────────────────┐
                             │   SQLite Database       │
                             │   (todos.db)            │
                             │   - Single todos table  │
                             │   - File-based storage  │
                             └─────────────────────────┘
```

## Component Details

### Frontend (Browser)

**Files**: `public/index.html`, `public/app.js`

**Responsibilities**:
- Render chat interface
- Handle user input
- Manage conversation history (localStorage)
- Display messages (user + assistant)
- Show thinking/loading states

**State Management**:
- `conversationHistory` array in localStorage
- Persists across page refreshes
- Sent with each request to server

**No Build Step**:
- Tailwind CSS loaded via CDN
- Vanilla JavaScript (no bundler)
- Works in any modern browser

### Express Server

**File**: `server.js`

**Responsibilities**:
- Serve static files from `public/`
- Handle `/chat` endpoint
- Initialize MCP client connection
- Call Claude API with tool definitions
- Execute tool calling loop
- Return final response to client

**Stateless Design**:
- No session storage
- No in-memory conversation state
- Client sends full context each time

**Tool Calling Loop**:
```javascript
while (response.stop_reason === 'tool_use') {
  // 1. Extract tool call from Claude response
  const toolUse = response.content.find(block => block.type === 'tool_use');

  // 2. Call MCP tool
  const result = await mcpClient.callTool({
    name: toolUse.name,
    arguments: toolUse.input
  });

  // 3. Add tool result to conversation
  messages.push({
    role: 'user',
    content: [{ type: 'tool_result', ...result }]
  });

  // 4. Continue conversation with Claude
  response = await anthropic.messages.create({ messages, tools });
}
```

### MCP Client

**Location**: Inside `server.js`

**Responsibilities**:
- Spawn MCP server process (`node index.js`)
- Connect via stdio transport
- List available tools
- Call tools with arguments
- Return tool results to Claude

**Implementation**:
```javascript
const mcpClient = new Client({
  name: 'todo-web-client',
  version: '1.0.0'
});

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./index.js']
});

await mcpClient.connect(transport);
```

### MCP Server

**File**: `index.js`

**Responsibilities**:
- Expose 6 MCP tools (create, list, update, delete, toggle_starred, set_priority)
- Validate inputs with Zod schemas
- Call TodoService for business logic
- Format responses as JSON
- Handle errors gracefully

**Tools Exposed**:
1. `create_todo` - Create new todo with optional metadata
2. `list_todos` - List todos with optional filters
3. `update_todo` - Update todo fields
4. `delete_todo` - Delete todo by ID
5. `toggle_starred` - Star/unstar a todo
6. `set_priority` - Set priority level (1-5)

**Tool Handler Pattern**:
```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'create_todo':
      const input = CreateTodoInputSchema.parse(args);
      const todo = service.createTodo(input.text, metadata);
      return { content: [{ type: 'text', text: JSON.stringify(todo) }] };
  }
});
```

### TodoService

**File**: `todoService.js`

**Responsibilities**:
- CRUD operations on todos
- Filtering (starred, priority, tags, completed)
- Database queries (raw SQL via better-sqlite3)
- Business logic (e.g., ordering by starred status)

**Implementation Pattern**:
```javascript
class TodoServiceImpl {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  createTodo(text, metadata = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO todos (text, starred, priority, tags, dueDate)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(...values);
    return this.getTodoById(result.lastInsertRowid);
  }
}
```

**No ORM**: Direct SQL for transparency and control.

### Database

**File**: `todos.db` (SQLite)

**Schema**:
```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  starred INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 3,
  tags TEXT,
  dueDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Storage**:
- Local development: `./todos.db`
- Docker/Fly.io: `/data/todos.db` (persistent volume)

**Synchronous API**:
better-sqlite3 is synchronous, simplifying code (no async/await for queries).

## Data Flow

### Creating a Todo

1. **User**: Types "Create a todo: Buy milk" in chat
2. **Browser**: Sends POST to `/chat` with message + history
3. **Server**: Forwards to Claude API with tool definitions
4. **Claude**: Returns `tool_use` response for `create_todo`
5. **MCP Client**: Calls MCP server's `create_todo` tool
6. **MCP Server**: Validates input, calls `TodoService.createTodo()`
7. **TodoService**: Executes SQL INSERT, returns new todo object
8. **MCP Server**: Returns todo as JSON to MCP client
9. **MCP Client**: Sends tool result back to Claude
10. **Claude**: Returns natural language response: "I've created the todo 'Buy milk'"
11. **Server**: Returns response + updated history to browser
12. **Browser**: Displays assistant message, stores updated history

### Listing Todos

1. **User**: Types "Show my starred todos"
2. **Browser**: Sends POST to `/chat`
3. **Claude**: Returns `tool_use` for `list_todos` with `{starred: true}`
4. **MCP Server**: Calls `TodoService.getTodos({starred: true})`
5. **TodoService**: Executes SQL SELECT with WHERE clause
6. **TodoService**: Returns filtered todos array
7. **MCP Server**: Returns todos as JSON
8. **Claude**: Formats as natural language list
9. **Browser**: Displays formatted response

## Type System

### JSDoc (types.js)

Provides IDE autocomplete and documentation:

```javascript
/**
 * @typedef {Object} Todo
 * @property {number} id
 * @property {string} text
 * @property {boolean} completed
 * @property {boolean} starred
 * @property {1|2|3|4|5} priority
 * @property {string[]} [tags]
 * @property {Date} [dueDate]
 */
```

### Zod (schemas.js)

Runtime validation:

```javascript
export const CreateTodoInputSchema = z.object({
  text: z.string().min(1),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().optional()
});
```

**Flow**: JSDoc → Zod → Tests → Implementation

## Environment Variables

### Development (.env)

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Production (Fly.io Secrets)

```bash
DB_PATH=/data/todos.db
PORT=8080
ANTHROPIC_API_KEY=sk-ant-...
```

## Port Configuration

- **Development**: Server runs on port 3000 (default)
- **Docker/Fly.io**: Server runs on port 8080 (via PORT env var)
- **Fly.io**: External HTTPS on port 443, internal HTTP on 8080

## Error Handling

### MCP Server

Catches errors and returns structured response:

```javascript
try {
  const todo = service.createTodo(input.text);
  return { content: [{ type: 'text', text: JSON.stringify(todo) }] };
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

### Express Server

Catches errors and returns 500:

```javascript
try {
  const response = await anthropic.messages.create({ ... });
  res.json({ response, conversationHistory });
} catch (error) {
  res.status(500).json({
    error: 'Failed to process message',
    details: error.message
  });
}
```

### Frontend

Displays error messages in chat:

```javascript
try {
  const data = await response.json();
  displayMessage(data.response, 'assistant');
} catch (error) {
  displayMessage('Sorry, something went wrong.', 'assistant');
}
```

## Scaling Considerations

### Current Limitations

- **SQLite**: Single writer, not suitable for high concurrency
- **In-process MCP server**: Can't scale server horizontally with shared state
- **No connection pooling**: Each request spawns MCP process

### When to Scale

These become issues at:
- \>100 concurrent users
- \>1000 todos per user
- \>50 requests/second

### Scaling Path

1. **Add Redis** for session storage (if needed)
2. **Switch to Postgres** for concurrent writes
3. **Separate MCP server** as standalone process
4. **Add load balancer** for multiple Express instances
5. **Add CDN** for static assets

Current architecture: Optimized for simplicity, not scale. Scale when pain is real.

## Security

### API Keys

- Never committed to git
- Stored in .env (development)
- Stored in Fly.io secrets (production)
- Server validates presence on startup

### Input Validation

- Zod validates all MCP tool inputs
- SQL uses parameterized queries (no injection risk)
- Client input sanitized before display

### HTTPS

- Fly.io provides automatic HTTPS
- force_https=true in fly.toml
- HTTP auto-redirects to HTTPS

## Monitoring

### Health Check

```bash
GET /health
```

Returns:
```json
{
  "status": "ok",
  "mcpConnected": true,
  "toolsAvailable": 6
}
```

### Logging

- Server logs to console
- Fly.io aggregates logs: `fly logs --app mcp-todo`
- No structured logging (add if needed)

## Future Architecture

### Planned Improvements

None currently. Add complexity only when needed.

### Considered but Rejected

- **GraphQL**: REST is simpler for this use case
- **WebSockets**: HTTP polling sufficient for chat
- **Microservices**: Monolith easier to reason about
- **Redis caching**: No performance bottleneck yet
