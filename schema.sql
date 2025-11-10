-- Todo table schema
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  starred INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 3,
  tags TEXT DEFAULT '[]',
  dueDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_tags ON todos(tags);
CREATE INDEX IF NOT EXISTS idx_starred ON todos(starred);
CREATE INDEX IF NOT EXISTS idx_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_completed ON todos(completed);
