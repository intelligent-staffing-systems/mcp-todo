import { beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import TodoServiceImpl from './todoService.js';
import { unlinkSync } from 'fs';

describe('TodoService', () => {
  let service;
  const testDbPath = './test-todos.db';

  beforeEach(() => {
    service = new TodoServiceImpl(testDbPath);
  });

  afterEach(() => {
    service.close();
    try {
      unlinkSync(testDbPath);
    } catch (e) {
      // File might not exist
    }
  });

  describe('createTodo', () => {
    it('should create a todo with text only', () => {
      const todo = service.createTodo('Buy milk');

      expect(todo.id).toBeDefined();
      expect(todo.text).toBe('Buy milk');
      expect(todo.completed).toBe(false);
      expect(todo.starred).toBe(false);
      expect(todo.priority).toBe(3);
      expect(todo.tags).toEqual([]);
      expect(todo.dueDate).toBeNull();
      expect(todo.createdAt).toBeInstanceOf(Date);
      expect(todo.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a todo with metadata', () => {
      const dueDate = new Date('2025-12-31');
      const todo = service.createTodo('Finish project', {
        starred: true,
        priority: 1,
        tags: ['work', 'pure-earth-labs'],
        dueDate
      });

      expect(todo.text).toBe('Finish project');
      expect(todo.starred).toBe(true);
      expect(todo.priority).toBe(1);
      expect(todo.tags).toEqual(['work', 'pure-earth-labs']);
      expect(todo.dueDate).toEqual(dueDate);
    });
  });

  describe('getTodos', () => {
    beforeEach(() => {
      service.createTodo('Task 1', { starred: true, priority: 1, tags: ['work'] });
      service.createTodo('Task 2', { priority: 2, tags: ['personal'] });
      service.createTodo('Task 3', { starred: false, priority: 3, tags: ['work', 'urgent'] });
    });

    it('should get all todos', () => {
      const todos = service.getTodos();
      expect(todos).toHaveLength(3);
    });

    it('should filter by starred', () => {
      const starred = service.getTodos({ starred: true });
      expect(starred).toHaveLength(1);
      expect(starred[0].text).toBe('Task 1');
    });

    it('should filter by priority', () => {
      const priority1 = service.getTodos({ priority: 1 });
      expect(priority1).toHaveLength(1);
      expect(priority1[0].text).toBe('Task 1');
    });

    it('should filter by tags', () => {
      const workTodos = service.getTodos({ tags: ['work'] });
      expect(workTodos).toHaveLength(2);
      expect(workTodos.map(t => t.text)).toContain('Task 1');
      expect(workTodos.map(t => t.text)).toContain('Task 3');
    });

    it('should filter by completed', () => {
      const allTodos = service.getTodos();
      service.updateTodo(allTodos[0].id, { completed: true });

      const completed = service.getTodos({ completed: true });
      expect(completed).toHaveLength(1);

      const incomplete = service.getTodos({ completed: false });
      expect(incomplete).toHaveLength(2);
    });
  });

  describe('updateTodo', () => {
    it('should update todo properties', () => {
      const todo = service.createTodo('Original text');

      const updated = service.updateTodo(todo.id, {
        text: 'Updated text',
        completed: true,
        starred: true,
        priority: 1,
        tags: ['updated']
      });

      expect(updated.text).toBe('Updated text');
      expect(updated.completed).toBe(true);
      expect(updated.starred).toBe(true);
      expect(updated.priority).toBe(1);
      expect(updated.tags).toEqual(['updated']);
    });

    it('should throw error for non-existent todo', () => {
      expect(() => {
        service.updateTodo('non-existent-id', { text: 'Test' });
      }).toThrow('Todo non-existent-id not found');
    });
  });

  describe('deleteTodo', () => {
    it('should delete an existing todo', () => {
      const todo = service.createTodo('Delete me');
      const result = service.deleteTodo(todo.id);

      expect(result).toBe(true);
      expect(service.getTodos()).toHaveLength(0);
    });

    it('should return false for non-existent todo', () => {
      const result = service.deleteTodo('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('toggleStarred', () => {
    it('should toggle starred status', () => {
      const todo = service.createTodo('Star me');
      expect(todo.starred).toBe(false);

      const starred = service.toggleStarred(todo.id, true);
      expect(starred.starred).toBe(true);

      const unstarred = service.toggleStarred(todo.id, false);
      expect(unstarred.starred).toBe(false);
    });
  });

  describe('setPriority', () => {
    it('should set priority', () => {
      const todo = service.createTodo('Prioritize me');
      const updated = service.setPriority(todo.id, 1);
      expect(updated.priority).toBe(1);
    });
  });

  describe('setTags', () => {
    it('should set tags', () => {
      const todo = service.createTodo('Tag me');
      const updated = service.setTags(todo.id, ['work', 'urgent']);
      expect(updated.tags).toEqual(['work', 'urgent']);
    });
  });
});
