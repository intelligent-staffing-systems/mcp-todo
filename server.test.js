import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import TodoServiceImpl from './todoService.js';
import fs from 'fs';

/**
 * REST API Tests
 * Testing the Express REST API endpoints for todo management
 */

// Import schemas for validation
import { CreateTodoRequestSchema, UpdateTodoRequestSchema } from './schemas.js';

// Create test server with actual implementation
function createTestServer() {
  const app = express();
  app.use(express.json());

  const testDbPath = './test-server-todos.db';
  const todoService = new TodoServiceImpl(testDbPath);

  // REST API endpoints - actual implementation
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

  return { app, todoService, testDbPath };
}

describe('REST API Endpoints', () => {
  let app, todoService, testDbPath;

  beforeEach(() => {
    const server = createTestServer();
    app = server.app;
    todoService = server.todoService;
    testDbPath = server.testDbPath;
  });

  afterEach(() => {
    todoService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/todos', () => {
    it('should return an empty array when no todos exist', async () => {
      const response = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all todos', async () => {
      // Create test data with slight delay to ensure different timestamps
      todoService.createTodo('Test todo 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      todoService.createTodo('Test todo 2');

      const response = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(response.body).toHaveLength(2);
      // Todos are sorted by priority (default 3) then by createdAt DESC
      // So newer todos appear first
      expect(response.body[0].text).toBe('Test todo 2');
      expect(response.body[1].text).toBe('Test todo 1');
    });

    it('should filter todos by starred status', async () => {
      todoService.createTodo('Not starred');
      todoService.createTodo('Starred', { starred: true });

      const response = await request(app)
        .get('/api/todos?starred=true')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Starred');
      expect(response.body[0].starred).toBe(true);
    });

    it('should filter todos by completed status', async () => {
      const todo = todoService.createTodo('Incomplete');
      const completedTodo = todoService.createTodo('Complete');
      todoService.updateTodo(completedTodo.id, { completed: true });

      const response = await request(app)
        .get('/api/todos?completed=true')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Complete');
    });

    it('should filter todos by priority', async () => {
      todoService.createTodo('Low priority', { priority: 5 });
      todoService.createTodo('High priority', { priority: 1 });

      const response = await request(app)
        .get('/api/todos?priority=1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('High priority');
    });

    it('should filter todos by tags', async () => {
      todoService.createTodo('Work task', { tags: ['work'] });
      todoService.createTodo('Personal task', { tags: ['personal'] });

      const response = await request(app)
        .get('/api/todos?tags=work')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Work task');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo with minimal data', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: 'New todo' })
        .expect(201);

      expect(response.body.text).toBe('New todo');
      expect(response.body.id).toBeDefined();
      expect(response.body.completed).toBe(false);
      expect(response.body.priority).toBe(3);
    });

    it('should create a todo with full metadata', async () => {
      const dueDate = new Date('2025-12-31').toISOString();
      const response = await request(app)
        .post('/api/todos')
        .send({
          text: 'Complete task',
          starred: true,
          priority: 1,
          tags: ['work', 'urgent'],
          dueDate,
        })
        .expect(201);

      expect(response.body.text).toBe('Complete task');
      expect(response.body.starred).toBe(true);
      expect(response.body.priority).toBe(1);
      expect(response.body.tags).toEqual(['work', 'urgent']);
      expect(response.body.dueDate).toBeDefined();
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if text is empty', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PATCH /api/todos/:id', () => {
    it('should update todo text', async () => {
      const todo = todoService.createTodo('Original text');

      const response = await request(app)
        .patch(`/api/todos/${todo.id}`)
        .send({ text: 'Updated text' })
        .expect(200);

      expect(response.body.text).toBe('Updated text');
      expect(response.body.id).toBe(todo.id);
    });

    it('should update todo completed status', async () => {
      const todo = todoService.createTodo('Todo to complete');

      const response = await request(app)
        .patch(`/api/todos/${todo.id}`)
        .send({ completed: true })
        .expect(200);

      expect(response.body.completed).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const todo = todoService.createTodo('Original');

      const response = await request(app)
        .patch(`/api/todos/${todo.id}`)
        .send({
          text: 'Updated',
          starred: true,
          priority: 1,
          completed: true,
        })
        .expect(200);

      expect(response.body.text).toBe('Updated');
      expect(response.body.starred).toBe(true);
      expect(response.body.priority).toBe(1);
      expect(response.body.completed).toBe(true);
    });

    it('should return 404 if todo not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .patch(`/api/todos/${fakeId}`)
        .send({ text: 'Updated' })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      const todo = todoService.createTodo('Todo to delete');

      await request(app)
        .delete(`/api/todos/${todo.id}`)
        .expect(204);

      // Verify it's deleted
      const todos = todoService.getTodos();
      expect(todos).toHaveLength(0);
    });

    it('should return 404 if todo not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .delete(`/api/todos/${fakeId}`)
        .expect(404);
    });
  });
});
