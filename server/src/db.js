import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data.sqlite");
export const db = new Database(dbPath);

export function initDb() {
  db.pragma("journal_mode = WAL");

  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      daily_demand REAL NOT NULL,
      lead_time_days REAL NOT NULL,
      current_stock REAL NOT NULL,
      service_level TEXT NOT NULL DEFAULT '0.95',
      demand_std_dev REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}
