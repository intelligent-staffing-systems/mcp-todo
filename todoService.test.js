import { beforeEach, afterEach, describe, it, expect } from 'vitest';
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
      expect(todo.points).toBeNull();
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

    it('should create a todo with story points', () => {
      const todo = service.createTodo('Complex refactoring', {
        points: 8
      });

      expect(todo.text).toBe('Complex refactoring');
      expect(todo.points).toBe(8);
    });

    it('should create a todo with all metadata including points', () => {
      const dueDate = new Date('2025-12-31');
      const todo = service.createTodo('Epic feature', {
        starred: true,
        priority: 1,
        tags: ['work'],
        dueDate,
        points: 13
      });

      expect(todo.text).toBe('Epic feature');
      expect(todo.starred).toBe(true);
      expect(todo.priority).toBe(1);
      expect(todo.tags).toEqual(['work']);
      expect(todo.dueDate).toEqual(dueDate);
      expect(todo.points).toBe(13);
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

    it('should update todo points', () => {
      const todo = service.createTodo('Task');

      const updated = service.updateTodo(todo.id, { points: 5 });
      expect(updated.points).toBe(5);

      const updatedAgain = service.updateTodo(todo.id, { points: 13 });
      expect(updatedAgain.points).toBe(13);
    });

    it('should throw error for non-existent todo', () => {
      const todo = service.createTodo('Test');
      const fakeId = '00000000-0000-0000-0000-000000000000';
      expect(() => {
        service.updateTodo(fakeId, { text: 'Test' });
      }).toThrow(`Todo ${fakeId} not found`);
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
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = service.deleteTodo(fakeId);
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

  describe('Validation', () => {
    it('should reject empty todo text', () => {
      expect(() => service.createTodo('')).toThrow('Todo text is required and cannot be empty');
      expect(() => service.createTodo('   ')).toThrow('Todo text is required and cannot be empty');
    });

    it('should reject invalid priority', () => {
      expect(() => service.createTodo('Test', { priority: 0 })).toThrow();
      expect(() => service.createTodo('Test', { priority: 6 })).toThrow();
      expect(() => service.createTodo('Test', { priority: 3.5 })).toThrow();
    });

    it('should reject invalid story points', () => {
      // Invalid: not in Fibonacci sequence
      expect(() => service.createTodo('Test', { points: 4 })).toThrow('Points must be one of: 1, 2, 3, 5, 8, 13');
      expect(() => service.createTodo('Test', { points: 7 })).toThrow('Points must be one of: 1, 2, 3, 5, 8, 13');
      expect(() => service.createTodo('Test', { points: 10 })).toThrow('Points must be one of: 1, 2, 3, 5, 8, 13');

      // Invalid: non-integer
      expect(() => service.createTodo('Test', { points: 3.5 })).toThrow();

      // Invalid: negative
      expect(() => service.createTodo('Test', { points: -1 })).toThrow();

      // Valid: Fibonacci values should work
      expect(() => service.createTodo('Test 1', { points: 1 })).not.toThrow();
      expect(() => service.createTodo('Test 2', { points: 2 })).not.toThrow();
      expect(() => service.createTodo('Test 3', { points: 3 })).not.toThrow();
      expect(() => service.createTodo('Test 5', { points: 5 })).not.toThrow();
      expect(() => service.createTodo('Test 8', { points: 8 })).not.toThrow();
      expect(() => service.createTodo('Test 13', { points: 13 })).not.toThrow();
    });

    it('should reject invalid filters', () => {
      expect(() => service.getTodos({ priority: 10 })).toThrow();
      expect(() => service.getTodos({ starred: 'yes' })).toThrow();
    });

    it('should reject invalid todo ID format', () => {
      expect(() => service.updateTodo('not-a-uuid', { text: 'Test' })).toThrow();
      expect(() => service.deleteTodo('invalid-id')).toThrow();
      expect(() => service.toggleStarred('bad-id', true)).toThrow();
    });

    it('should reject invalid update fields', () => {
      const todo = service.createTodo('Test');
      expect(() => service.updateTodo(todo.id, { priority: 0 })).toThrow();
      expect(() => service.updateTodo(todo.id, { text: '' })).toThrow();
      expect(() => service.updateTodo(todo.id, { points: 4 })).toThrow('Points must be one of: 1, 2, 3, 5, 8, 13');
    });
  });
});
