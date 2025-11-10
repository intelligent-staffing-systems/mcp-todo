import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  ProjectSchema,
} from './schemas.js';

class ProjectServiceImpl {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all projects
   * @returns {Project[]}
   */
  getProjects() {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
    return rows.map(row => this.rowToProject(row));
  }

  /**
   * Get a project by ID
   * @param {string} id
   * @returns {Project}
   */
  getProject(id) {
    z.string().uuid().parse(id);
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) throw new Error(`Project ${id} not found`);
    return this.rowToProject(row);
  }

  /**
   * Create a new project
   * @param {string} name
   * @param {string} [description]
   * @returns {Project}
   */
  createProject(name, description = null) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Project name is required and cannot be empty');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO projects (id, name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      description,
      now,
      now
    );

    return this.rowToProject(this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  }

  /**
   * Update a project
   * @param {string} id
   * @param {Object} updates
   * @param {string} [updates.name]
   * @param {string} [updates.description]
   * @returns {Project}
   */
  updateProject(id, updates) {
    z.string().uuid().parse(id);

    const current = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!current) throw new Error(`Project ${id} not found`);

    const updatedAt = new Date().toISOString();
    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        throw new Error('Project name cannot be empty');
      }
      fields.push('name = ?');
      params.push(updates.name.trim());
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (fields.length === 0) {
      return this.rowToProject(current);
    }

    fields.push('updatedAt = ?');
    params.push(updatedAt);
    params.push(id);

    this.db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return this.rowToProject(this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  }

  /**
   * Delete a project
   * @param {string} id
   * @returns {boolean}
   */
  deleteProject(id) {
    z.string().uuid().parse(id);

    // Set projectId to NULL for all todos in this project
    this.db.prepare('UPDATE todos SET projectId = NULL WHERE projectId = ?').run(id);

    const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Convert a database row to a Project object
   * @param {Object} row
   * @returns {Project}
   */
  rowToProject(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}

export default ProjectServiceImpl;
