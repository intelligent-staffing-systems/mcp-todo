import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { z } from 'zod';
import {
  TodoFiltersSchema,
  TodoCreateMetadataSchema,
  TodoUpdateSchema,
} from './schemas.js';

/** @typedef {import('./types.js').Todo} Todo */
/** @typedef {import('./types.js').TodoService} TodoService */

class TodoServiceImpl {
  constructor(dbPath = './todos.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  initializeDatabase() {
    const schema = readFileSync('./schema.sql', 'utf-8');
    this.db.exec(schema);
  }

  /**
   * @param {Object} filters
   * @param {string} [filters.projectId]
   * @param {string[]} [filters.tags]
   * @param {boolean} [filters.starred]
   * @param {number} [filters.priority]
   * @param {boolean} [filters.completed]
   * @returns {Todo[]}
   */
  getTodos(filters = {}) {
    // Validate filters
    const validatedFilters = TodoFiltersSchema.parse(filters);

    let query = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    if (validatedFilters.projectId !== undefined) {
      query += ' AND projectId = ?';
      params.push(validatedFilters.projectId);
    }

    if (validatedFilters.starred !== undefined) {
      query += ' AND starred = ?';
      params.push(validatedFilters.starred ? 1 : 0);
    }

    if (validatedFilters.priority !== undefined) {
      query += ' AND priority = ?';
      params.push(validatedFilters.priority);
    }

    if (validatedFilters.completed !== undefined) {
      query += ' AND completed = ?';
      params.push(validatedFilters.completed ? 1 : 0);
    }

    query += ' ORDER BY priority ASC, createdAt DESC';

    const rows = this.db.prepare(query).all(...params);

    // Filter by tags in memory and parse JSON
    return rows
      .map(row => this.rowToTodo(row))
      .filter(todo => {
        if (!validatedFilters.tags || validatedFilters.tags.length === 0) return true;
        return validatedFilters.tags.some(tag => todo.tags.includes(tag));
      });
  }

  /**
   * @param {string} text
   * @param {Object} metadata
   * @param {string} [metadata.projectId]
   * @param {string} [metadata.title]
   * @param {boolean} [metadata.starred]
   * @param {number} [metadata.priority]
   * @param {string[]} [metadata.tags]
   * @param {Date} [metadata.dueDate]
   * @returns {Todo}
   */
  createTodo(text, metadata = {}) {
    // Validate inputs
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Todo text is required and cannot be empty');
    }
    const validatedMetadata = TodoCreateMetadataSchema.parse(metadata);

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO todos (id, projectId, title, text, completed, starred, priority, tags, dueDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      validatedMetadata.projectId || null,
      validatedMetadata.title || null,
      text.trim(),
      0,
      validatedMetadata.starred ? 1 : 0,
      validatedMetadata.priority || 3,
      JSON.stringify(validatedMetadata.tags || []),
      validatedMetadata.dueDate ? validatedMetadata.dueDate.toISOString() : null,
      now,
      now
    );

    return this.rowToTodo(this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
  }

  /**
   * @param {string} id
   * @param {Object} updates
   * @returns {Todo}
   */
  updateTodo(id, updates) {
    // Validate inputs
    const validatedUpdates = TodoUpdateSchema.parse({ id, ...updates });

    const current = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(validatedUpdates.id);
    if (!current) throw new Error(`Todo ${validatedUpdates.id} not found`);

    const updatedAt = new Date().toISOString();
    const fields = [];
    const params = [];

    if (validatedUpdates.projectId !== undefined) {
      fields.push('projectId = ?');
      params.push(validatedUpdates.projectId);
    }
    if (validatedUpdates.title !== undefined) {
      fields.push('title = ?');
      params.push(validatedUpdates.title);
    }
    if (validatedUpdates.text !== undefined) {
      fields.push('text = ?');
      params.push(validatedUpdates.text.trim());
    }
    if (validatedUpdates.completed !== undefined) {
      fields.push('completed = ?');
      params.push(validatedUpdates.completed ? 1 : 0);
    }
    if (validatedUpdates.starred !== undefined) {
      fields.push('starred = ?');
      params.push(validatedUpdates.starred ? 1 : 0);
    }
    if (validatedUpdates.priority !== undefined) {
      fields.push('priority = ?');
      params.push(validatedUpdates.priority);
    }
    if (validatedUpdates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(validatedUpdates.tags));
    }
    if (validatedUpdates.dueDate !== undefined) {
      fields.push('dueDate = ?');
      params.push(validatedUpdates.dueDate ? validatedUpdates.dueDate.toISOString() : null);
    }

    fields.push('updatedAt = ?');
    params.push(updatedAt);
    params.push(validatedUpdates.id);

    this.db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.rowToTodo(this.db.prepare('SELECT * FROM todos WHERE id = ?').get(validatedUpdates.id));
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  deleteTodo(id) {
    z.string().uuid().parse(id);
    const result = this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * @param {string} id
   * @param {boolean} starred
   * @returns {Todo}
   */
  toggleStarred(id, starred) {
    return this.updateTodo(id, { starred });
  }

  /**
   * @param {string} id
   * @param {number} priority
   * @returns {Todo}
   */
  setPriority(id, priority) {
    return this.updateTodo(id, { priority });
  }

  /**
   * @param {string} id
   * @param {string[]} tags
   * @returns {Todo}
   */
  setTags(id, tags) {
    return this.updateTodo(id, { tags });
  }

  /**
   * @param {Object} row
   * @returns {Todo}
   */
  rowToTodo(row) {
    return {
      id: row.id,
      projectId: row.projectId || null,
      title: row.title || null,
      text: row.text,
      completed: Boolean(row.completed),
      starred: Boolean(row.starred),
      priority: row.priority,
      tags: JSON.parse(row.tags),
      dueDate: row.dueDate ? new Date(row.dueDate) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  close() {
    this.db.close();
  }
}

export default TodoServiceImpl;
