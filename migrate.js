#!/usr/bin/env node
/**
 * Database migration script to add displayOrder column
 */

import Database from 'better-sqlite3';

const dbPath = process.argv[2] || './todos.db';

console.log(`Migrating database: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(todos)").all();
  const hasDisplayOrder = tableInfo.some(col => col.name === 'displayOrder');

  if (hasDisplayOrder) {
    console.log('✓ displayOrder column already exists. No migration needed.');
    process.exit(0);
  }

  console.log('Adding displayOrder column...');

  // Add displayOrder column with default value 0
  db.exec('ALTER TABLE todos ADD COLUMN displayOrder INTEGER DEFAULT 0');

  // Set displayOrder based on current order (priority ASC, createdAt DESC)
  const todos = db.prepare('SELECT id FROM todos ORDER BY priority ASC, createdAt DESC').all();

  const updateStmt = db.prepare('UPDATE todos SET displayOrder = ? WHERE id = ?');
  const transaction = db.transaction((todos) => {
    todos.forEach((todo, index) => {
      updateStmt.run(index, todo.id);
    });
  });

  transaction(todos);

  // Create index for displayOrder
  db.exec('CREATE INDEX IF NOT EXISTS idx_displayOrder ON todos(displayOrder)');

  console.log(`✓ Migration complete! Updated ${todos.length} todos.`);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
