export const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    videoPath TEXT,
    videoName TEXT,
    videoDuration REAL,
    videoFormat TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS markers (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    timestampSeconds REAL NOT NULL,
    description TEXT,
    source TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clip_rules (
    projectId TEXT PRIMARY KEY,
    beforeSeconds REAL NOT NULL,
    afterSeconds REAL NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clip_tasks (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    beforeSeconds REAL NOT NULL,
    afterSeconds REAL NOT NULL,
    status TEXT NOT NULL,
    errorMessage TEXT,
    outputDir TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clip_task_items (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL,
    markerId TEXT NOT NULL,
    startSeconds REAL NOT NULL,
    endSeconds REAL NOT NULL,
    outputFile TEXT,
    status TEXT NOT NULL,
    errorMessage TEXT,
    FOREIGN KEY (taskId) REFERENCES clip_tasks(id) ON DELETE CASCADE
  );
`;
