import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), ".openclaw");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "openclaw.db");

// ── Try to load better-sqlite3 (needs native binary) ─────────
let BetterSqlite3: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BetterSqlite3 = require("better-sqlite3");
} catch {
  console.warn("[DB] better-sqlite3 not available – running in memory-only mode");
  console.warn("[DB] To enable persistence: install Visual Studio C++ Build Tools, then run: npm install");
}

// ── In-memory fallback ────────────────────────────────────────
// Provides the same prepare().all/get/run and exec interface
// so the rest of the server code works unchanged.
function makeMemoryDb() {
  const tables: Record<string, Record<string, any>[]> = {
    agents: [], messages: [], experiences: [], experience_transfers: [],
  };

  const stub = {
    prepare(sql: string) {
      return {
        all(..._args: any[]) { return extractTable(sql, tables) ?? []; },
        get(..._args: any[]) {
          // COUNT(*) queries
          if (/SELECT COUNT/i.test(sql)) return { c: 0 };
          const rows = extractTable(sql, tables) ?? [];
          return rows[0] ?? null;
        },
        run(..._args: any[]) { return { changes: 0, lastInsertRowid: 0 }; },
      };
    },
    exec(_sql: string) { /* no-op */ },
    pragma(_s: string) { /* no-op */ },
  };
  return stub;
}

function extractTable(sql: string, tables: Record<string, any[]>) {
  for (const t of Object.keys(tables)) {
    if (sql.toLowerCase().includes(t)) return tables[t];
  }
  return [];
}

// ── Public API ────────────────────────────────────────────────
let _db: any = null;

export function getDb(): any {
  if (_db) return _db;

  if (!BetterSqlite3) {
    _db = makeMemoryDb();
    return _db;
  }

  try {
    _db = new BetterSqlite3(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  } catch (e) {
    console.error("[DB] Failed to open database, falling back to memory mode:", e);
    _db = makeMemoryDb();
  }
  return _db;
}

function initSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'worker',
      platform TEXT NOT NULL DEFAULT 'openclaw',
      status TEXT NOT NULL DEFAULT 'offline',
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      pid INTEGER,
      version TEXT NOT NULL DEFAULT '0.1.0',
      capabilities TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      connected_to TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      total_messages INTEGER NOT NULL DEFAULT 0,
      total_experiences INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      content TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      reply_to_id TEXT,
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      read_at TEXT
    );

    CREATE TABLE IF NOT EXISTS experiences (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      confidence INTEGER NOT NULL DEFAULT 80,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS experience_transfers (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      experience_ids TEXT NOT NULL DEFAULT '[]',
      accepted INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_id);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_experiences_agent ON experiences(agent_id);
    CREATE INDEX IF NOT EXISTS idx_experiences_category ON experiences(category);
  `);
}
