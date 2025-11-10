import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

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
   * @param {string[]} [filters.tags]
   * @param {boolean} [filters.starred]
   * @param {number} [filters.priority]
   * @param {boolean} [filters.completed]
   * @returns {Todo[]}
   */
  getTodos(filters = {}) {
    let query = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    if (filters.starred !== undefined) {
      query += ' AND starred = ?';
      params.push(filters.starred ? 1 : 0);
    }

    if (filters.priority !== undefined) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters.completed !== undefined) {
      query += ' AND completed = ?';
      params.push(filters.completed ? 1 : 0);
    }

    query += ' ORDER BY priority ASC, createdAt DESC';

    const rows = this.db.prepare(query).all(...params);

    // Filter by tags in memory and parse JSON
    return rows
      .map(row => this.rowToTodo(row))
      .filter(todo => {
        if (!filters.tags || filters.tags.length === 0) return true;
        return filters.tags.some(tag => todo.tags.includes(tag));
      });
  }

  /**
   * @param {string} text
   * @param {Object} metadata
   * @param {boolean} [metadata.starred]
   * @param {number} [metadata.priority]
   * @param {string[]} [metadata.tags]
   * @param {Date} [metadata.dueDate]
   * @returns {Todo}
   */
  createTodo(text, metadata = {}) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO todos (id, text, completed, starred, priority, tags, dueDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      text,
      0,
      metadata.starred ? 1 : 0,
      metadata.priority || 3,
      JSON.stringify(metadata.tags || []),
      metadata.dueDate ? metadata.dueDate.toISOString() : null,
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
    const current = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!current) throw new Error(`Todo ${id} not found`);

    const updatedAt = new Date().toISOString();
    const fields = [];
    const params = [];

    if (updates.text !== undefined) {
      fields.push('text = ?');
      params.push(updates.text);
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?');
      params.push(updates.completed ? 1 : 0);
    }
    if (updates.starred !== undefined) {
      fields.push('starred = ?');
      params.push(updates.starred ? 1 : 0);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      params.push(updates.priority);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.dueDate !== undefined) {
      fields.push('dueDate = ?');
      params.push(updates.dueDate ? updates.dueDate.toISOString() : null);
    }

    fields.push('updatedAt = ?');
    params.push(updatedAt);
    params.push(id);

    this.db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.rowToTodo(this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  deleteTodo(id) {
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
