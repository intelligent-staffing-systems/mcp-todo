import { z } from 'zod';

/**
 * Zod schemas for runtime validation
 * These match the JSDoc types in types.js but provide runtime enforcement
 */

// Todo schema
export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1, 'Todo text cannot be empty'),
  completed: z.boolean(),
  starred: z.boolean(),
  priority: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  dueDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Partial Todo for updates (all fields optional except id)
export const TodoUpdateSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.date().nullable().optional(),
});

// Todo creation metadata
export const TodoCreateMetadataSchema = z.object({
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
});

// Filters for getTodos
export const TodoFiltersSchema = z.object({
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
});

// MCP tool input schemas
export const CreateTodoInputSchema = z.object({
  text: z.string().min(1, 'Todo text is required'),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(), // ISO string from MCP
});

export const ListTodosInputSchema = z.object({
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
});

export const UpdateTodoInputSchema = z.object({
  id: z.string().uuid('Valid todo ID required'),
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(), // ISO string from MCP
});

export const DeleteTodoInputSchema = z.object({
  id: z.string().uuid('Valid todo ID required'),
});

export const ToggleStarredInputSchema = z.object({
  id: z.string().uuid('Valid todo ID required'),
  starred: z.boolean(),
});

export const SetPriorityInputSchema = z.object({
  id: z.string().uuid('Valid todo ID required'),
  priority: z.number().int().min(1).max(5, 'Priority must be between 1 and 5'),
});

export const SetTagsInputSchema = z.object({
  id: z.string().uuid('Valid todo ID required'),
  tags: z.array(z.string()),
});

// REST API request/response schemas
export const CreateTodoRequestSchema = z.object({
  text: z.string().min(1, 'Todo text is required'),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(), // ISO string from REST API
});

export const UpdateTodoRequestSchema = z.object({
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  starred: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(), // ISO string from REST API
});

export const TodoFiltersRequestSchema = z.object({
  starred: z.enum(['true', 'false']).optional(),
  completed: z.enum(['true', 'false']).optional(),
  priority: z.string().regex(/^[1-5]$/).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});
