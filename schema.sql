-- Projects table schema
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Todo table schema
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  title TEXT,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  starred INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 3,
  tags TEXT DEFAULT '[]',
  dueDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_project ON todos(projectId);
CREATE INDEX IF NOT EXISTS idx_tags ON todos(tags);
CREATE INDEX IF NOT EXISTS idx_starred ON todos(starred);
CREATE INDEX IF NOT EXISTS idx_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_completed ON todos(completed);
