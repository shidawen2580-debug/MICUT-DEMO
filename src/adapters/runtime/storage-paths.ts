import fs from "node:fs";
import path from "node:path";

export interface AppPaths {
  rootDir: string;
  dataDir: string;
  exportsDir: string;
  tempDir: string;
  videosDir: string;
  dbPath: string;
}

export function resolveAppPaths(baseDir: string): AppPaths {
  const rootDir = path.resolve(baseDir);
  return {
    rootDir,
    dataDir: path.join(rootDir, "data"),
    exportsDir: path.join(rootDir, "exports"),
    tempDir: path.join(rootDir, "temp"),
    videosDir: path.join(rootDir, "videos"),
    dbPath: path.join(rootDir, "data", "db.sqlite"),
  };
}

export function ensureAppPaths(paths: AppPaths): void {
  fs.mkdirSync(paths.dataDir, { recursive: true });
  fs.mkdirSync(paths.exportsDir, { recursive: true });
  fs.mkdirSync(paths.tempDir, { recursive: true });
  fs.mkdirSync(paths.videosDir, { recursive: true });
}
