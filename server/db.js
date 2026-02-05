import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'workflows.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    steps TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    results TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    total_cost REAL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
`);
try {
  db.exec('ALTER TABLE executions ADD COLUMN total_cost REAL');
} catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_budget REAL DEFAULT 0,
    retry_budget INTEGER DEFAULT 3,
    model_costs TEXT DEFAULT '{}',
    notification_email TEXT DEFAULT ''
  );
  INSERT OR IGNORE INTO settings (id, total_budget, retry_budget, model_costs, notification_email) VALUES (1, 0, 3, '{}', '');
`);

export default db;
