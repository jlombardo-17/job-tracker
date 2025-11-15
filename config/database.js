import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'jobs.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Promisify database methods for easier use
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));
db.execAsync = promisify(db.exec.bind(db));

// Enable WAL mode for better concurrent access
db.run('PRAGMA journal_mode = WAL');

// Helper function to run queries synchronously (for compatibility)
db.prepare = (sql) => {
  return {
    run: (...params) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        });
      });
    },
    get: (...params) => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },
    all: (...params) => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  };
};

export default db;
