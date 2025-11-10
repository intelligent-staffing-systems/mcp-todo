import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import TodoServiceImpl from './todoService.js';
import { CreateTodoRequestSchema, UpdateTodoRequestSchema } from './schemas.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize shared TodoService (single source of truth)
const dbPath = process.env.DB_PATH || './todos.db';
const todoService = new TodoServiceImpl(dbPath);

// Define MCP tools that use the shared TodoService
const mcpTools = [
  {
    name: 'create_todo',
    description: 'Create a new todo item',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The todo item text' },
        starred: { type: 'boolean', description: 'Whether to star this todo' },
        priority: { type: 'number', description: 'Priority tier (1=highest, 5=lowest)', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization' },
        dueDate: { type: 'string', description: 'Due date in ISO format' },
      },
      required: ['text'],
    },
  },
  {
    name: 'list_todos',
    description: 'List todos with optional filters',
    input_schema: {
      type: 'object',
      properties: {
        starred: { type: 'boolean', description: 'Filter by starred status' },
        priority: { type: 'number', description: 'Filter by priority tier', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        completed: { type: 'boolean', description: 'Filter by completion status' },
      },
    },
  },
  {
    name: 'update_todo',
    description: 'Update a todo item',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo ID' },
        text: { type: 'string', description: 'Updated text' },
        completed: { type: 'boolean', description: 'Completion status' },
        starred: { type: 'boolean', description: 'Starred status' },
        priority: { type: 'number', description: 'Priority tier', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        dueDate: { type: 'string', description: 'Due date in ISO format' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo item',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'toggle_starred',
    description: 'Star or unstar a todo',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo ID' },
        starred: { type: 'boolean', description: 'Star (true) or unstar (false)' },
      },
      required: ['id', 'starred'],
    },
  },
  {
    name: 'set_priority',
    description: 'Set priority for a todo',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The todo ID' },
        priority: { type: 'number', description: 'Priority tier (1=highest, 5=lowest)', minimum: 1, maximum: 5 },
      },
      required: ['id', 'priority'],
    },
  },
];

// Execute MCP tool calls using shared TodoService
function executeMCPTool(name, args) {
  try {
    switch (name) {
      case 'create_todo': {
        const metadata = {
          starred: args.starred,
          priority: args.priority,
          tags: args.tags,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
        };
        return todoService.createTodo(args.text, metadata);
      }

      case 'list_todos': {
        return todoService.getTodos(args);
      }

      case 'update_todo': {
        const updates = {
          text: args.text,
          completed: args.completed,
          starred: args.starred,
          priority: args.priority,
          tags: args.tags,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
        };
        return todoService.updateTodo(args.id, updates);
      }

      case 'delete_todo': {
        const result = todoService.deleteTodo(args.id);
        return { success: result, message: result ? 'Todo deleted successfully' : 'Todo not found' };
      }

      case 'toggle_starred': {
        return todoService.toggleStarred(args.id, args.starred);
      }

      case 'set_priority': {
        return todoService.setPriority(args.id, args.priority);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw error;
  }
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array with history
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      tools: mcpTools,
      messages,
    });

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');

      if (!toolUse) break;

      // Execute tool using shared TodoService
      let toolResult;
      try {
        const result = executeMCPTool(toolUse.name, toolUse.input);
        toolResult = {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        toolResult = {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }

      // Add assistant response and tool result to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult.content),
        }],
      });

      // Continue conversation with tool result
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        tools: mcpTools,
        messages,
      });
    }

    // Extract final text response
    const textContent = response.content.find(block => block.type === 'text');

    res.json({
      response: textContent?.text || 'No response',
      conversationHistory: [
        ...messages,
        { role: 'assistant', content: response.content },
      ],
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
    });
  }
});

// REST API endpoints for todos
app.get('/api/todos', (req, res) => {
  try {
    const filters = {};
    if (req.query.starred !== undefined) filters.starred = req.query.starred === 'true';
    if (req.query.completed !== undefined) filters.completed = req.query.completed === 'true';
    if (req.query.priority !== undefined) filters.priority = parseInt(req.query.priority);
    if (req.query.tags !== undefined) filters.tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];

    const todos = todoService.getTodos(filters);
    res.json(todos);
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ error: 'Failed to get todos', details: error.message });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    // Validate request body
    const validatedData = CreateTodoRequestSchema.parse(req.body);

    const metadata = {
      starred: validatedData.starred,
      priority: validatedData.priority,
      tags: validatedData.tags,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    };

    const todo = todoService.createTodo(validatedData.text, metadata);
    res.status(201).json(todo);
  } catch (error) {
    console.error('Create todo error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.message });
    } else if (error.message.includes('required') || error.message.includes('empty')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create todo', details: error.message });
    }
  }
});

app.patch('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = UpdateTodoRequestSchema.parse(req.body);

    const updates = {
      text: validatedData.text,
      completed: validatedData.completed,
      starred: validatedData.starred,
      priority: validatedData.priority,
      tags: validatedData.tags,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    };

    const todo = todoService.updateTodo(id, updates);
    res.json(todo);
  } catch (error) {
    console.error('Update todo error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Todo not found', details: error.message });
    } else if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update todo', details: error.message });
    }
  }
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = todoService.deleteTodo(id);

    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ error: 'Failed to delete todo', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    toolsAvailable: mcpTools.length,
  });
});

// Start server
app.listen(port, () => {
  console.log(`Todo web server running on http://localhost:${port}`);
  console.log(`Using database: ${dbPath}`);
  console.log(`Available MCP tools: ${mcpTools.length}`);
});
