import Database from "better-sqlite3";
import { ensureAppPaths, type AppPaths } from "../runtime/storage-paths.js";
import { sqliteSchema } from "./schema.js";

export interface SqliteContext {
  db: Database.Database;
  paths: AppPaths;
}

export function createSqliteContext(paths: AppPaths): SqliteContext {
  ensureAppPaths(paths);
  const db = new Database(paths.dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(sqliteSchema);
  return { db, paths };
}
