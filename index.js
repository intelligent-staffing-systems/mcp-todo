#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import TodoServiceImpl from './todoService.js';

const service = new TodoServiceImpl('./todos.db');

const server = new Server(
  {
    name: 'todo-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_todo',
        description: 'Create a new todo item',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The todo item text',
            },
            starred: {
              type: 'boolean',
              description: 'Whether to star this todo',
            },
            priority: {
              type: 'number',
              description: 'Priority tier (1=highest, 5=lowest)',
              minimum: 1,
              maximum: 5,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for organization (e.g., ["work", "pure-earth-labs"])',
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO format (e.g., "2025-12-31")',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'list_todos',
        description: 'List todos with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            starred: {
              type: 'boolean',
              description: 'Filter by starred status',
            },
            priority: {
              type: 'number',
              description: 'Filter by priority tier',
              minimum: 1,
              maximum: 5,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags (shows todos with any of these tags)',
            },
            completed: {
              type: 'boolean',
              description: 'Filter by completion status',
            },
          },
        },
      },
      {
        name: 'update_todo',
        description: 'Update a todo item',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The todo ID',
            },
            text: {
              type: 'string',
              description: 'Updated text',
            },
            completed: {
              type: 'boolean',
              description: 'Completion status',
            },
            starred: {
              type: 'boolean',
              description: 'Starred status',
            },
            priority: {
              type: 'number',
              description: 'Priority tier',
              minimum: 1,
              maximum: 5,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags',
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO format',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_todo',
        description: 'Delete a todo item',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The todo ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'toggle_starred',
        description: 'Star or unstar a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The todo ID',
            },
            starred: {
              type: 'boolean',
              description: 'Star (true) or unstar (false)',
            },
          },
          required: ['id', 'starred'],
        },
      },
      {
        name: 'set_priority',
        description: 'Set priority for a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The todo ID',
            },
            priority: {
              type: 'number',
              description: 'Priority tier (1=highest, 5=lowest)',
              minimum: 1,
              maximum: 5,
            },
          },
          required: ['id', 'priority'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_todo': {
        const metadata = {};
        if (args.starred !== undefined) metadata.starred = args.starred;
        if (args.priority !== undefined) metadata.priority = args.priority;
        if (args.tags !== undefined) metadata.tags = args.tags;
        if (args.dueDate !== undefined) metadata.dueDate = new Date(args.dueDate);

        const todo = service.createTodo(args.text, metadata);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      }

      case 'list_todos': {
        const filters = {};
        if (args.starred !== undefined) filters.starred = args.starred;
        if (args.priority !== undefined) filters.priority = args.priority;
        if (args.tags !== undefined) filters.tags = args.tags;
        if (args.completed !== undefined) filters.completed = args.completed;

        const todos = service.getTodos(filters);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todos, null, 2),
            },
          ],
        };
      }

      case 'update_todo': {
        const updates = {};
        if (args.text !== undefined) updates.text = args.text;
        if (args.completed !== undefined) updates.completed = args.completed;
        if (args.starred !== undefined) updates.starred = args.starred;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.tags !== undefined) updates.tags = args.tags;
        if (args.dueDate !== undefined) updates.dueDate = new Date(args.dueDate);

        const todo = service.updateTodo(args.id, updates);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      }

      case 'delete_todo': {
        const result = service.deleteTodo(args.id);
        return {
          content: [
            {
              type: 'text',
              text: result ? 'Todo deleted successfully' : 'Todo not found',
            },
          ],
        };
      }

      case 'toggle_starred': {
        const todo = service.toggleStarred(args.id, args.starred);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      }

      case 'set_priority': {
        const todo = service.setPriority(args.id, args.priority);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(todo, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Todo MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
