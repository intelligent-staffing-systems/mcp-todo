#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import TodoServiceImpl from './todoService.js';
import ProjectServiceImpl from './projectService.js';
import {
  CreateTodoInputSchema,
  ListTodosInputSchema,
  UpdateTodoInputSchema,
  DeleteTodoInputSchema,
  ToggleStarredInputSchema,
  SetPriorityInputSchema,
  CreateProjectInputSchema,
  ListProjectsInputSchema,
  UpdateProjectInputSchema,
  DeleteProjectInputSchema,
  GetProjectInputSchema,
} from './schemas.js';

// Use environment variable for DB path, default to local file
const dbPath = process.env.DB_PATH || './todos.db';
const todoService = new TodoServiceImpl(dbPath);
const projectService = new ProjectServiceImpl(todoService.db);

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
            projectId: {
              type: 'string',
              description: 'Project ID this todo belongs to',
            },
            title: {
              type: 'string',
              description: 'Short title for the todo',
            },
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
            projectId: {
              type: 'string',
              description: 'Filter by project ID',
            },
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
            projectId: {
              type: 'string',
              description: 'Project ID (set to null to remove from project)',
            },
            title: {
              type: 'string',
              description: 'Updated title',
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
      {
        name: 'create_project',
        description: 'Create a new project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The project name',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get a project by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The project ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_project',
        description: 'Update a project',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The project ID',
            },
            name: {
              type: 'string',
              description: 'Updated project name',
            },
            description: {
              type: 'string',
              description: 'Updated project description',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a project (todos in project will be unassigned)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The project ID',
            },
          },
          required: ['id'],
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
        const input = CreateTodoInputSchema.parse(args);
        const metadata = {
          projectId: input.projectId,
          title: input.title,
          starred: input.starred,
          priority: input.priority,
          tags: input.tags,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        };
        const todo = todoService.createTodo(input.text, metadata);
        return { content: [{ type: 'text', text: JSON.stringify(todo, null, 2) }] };
      }

      case 'list_todos': {
        const filters = ListTodosInputSchema.parse(args);
        const todos = todoService.getTodos(filters);
        return { content: [{ type: 'text', text: JSON.stringify(todos, null, 2) }] };
      }

      case 'update_todo': {
        const input = UpdateTodoInputSchema.parse(args);
        const updates = {
          projectId: input.projectId,
          title: input.title,
          text: input.text,
          completed: input.completed,
          starred: input.starred,
          priority: input.priority,
          tags: input.tags,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        };
        const todo = todoService.updateTodo(input.id, updates);
        return { content: [{ type: 'text', text: JSON.stringify(todo, null, 2) }] };
      }

      case 'delete_todo': {
        const input = DeleteTodoInputSchema.parse(args);
        const result = todoService.deleteTodo(input.id);
        return { content: [{ type: 'text', text: result ? 'Todo deleted successfully' : 'Todo not found' }] };
      }

      case 'toggle_starred': {
        const input = ToggleStarredInputSchema.parse(args);
        const todo = todoService.toggleStarred(input.id, input.starred);
        return { content: [{ type: 'text', text: JSON.stringify(todo, null, 2) }] };
      }

      case 'set_priority': {
        const input = SetPriorityInputSchema.parse(args);
        const todo = todoService.setPriority(input.id, input.priority);
        return { content: [{ type: 'text', text: JSON.stringify(todo, null, 2) }] };
      }

      case 'create_project': {
        const input = CreateProjectInputSchema.parse(args);
        const project = projectService.createProject(input.name, input.description);
        return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
      }

      case 'list_projects': {
        ListProjectsInputSchema.parse(args);
        const projects = projectService.getProjects();
        return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
      }

      case 'get_project': {
        const input = GetProjectInputSchema.parse(args);
        const project = projectService.getProject(input.id);
        return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
      }

      case 'update_project': {
        const input = UpdateProjectInputSchema.parse(args);
        const updates = {
          name: input.name,
          description: input.description,
        };
        const project = projectService.updateProject(input.id, updates);
        return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
      }

      case 'delete_project': {
        const input = DeleteProjectInputSchema.parse(args);
        const result = projectService.deleteProject(input.id);
        return { content: [{ type: 'text', text: result ? 'Project deleted successfully' : 'Project not found' }] };
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
