import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mi-cut-electron-smoke-"));
const storageRoot = path.join(tempRoot, "storage");
const fixturesRoot = path.join(tempRoot, "fixtures");
fs.mkdirSync(fixturesRoot, { recursive: true });

const smokeVideoPath = path.join(fixturesRoot, "smoke-video.mp4");
fs.writeFileSync(smokeVideoPath, "not-a-real-video-but-bindable");

const fakeBinDir = path.join(tempRoot, "bin");
fs.mkdirSync(fakeBinDir, { recursive: true });
const fakeFfmpegPath = path.join(fakeBinDir, process.platform === "win32" ? "ffmpeg.cmd" : "ffmpeg");
const fakeScript = process.platform === "win32"
  ? "@echo off\r\nset last=\r\n:loop\r\nif \"%~1\"==\"\" goto done\r\nset last=%~1\r\nshift\r\ngoto loop\r\n:done\r\nif not \"%last%\"==\"\" type nul > \"%last%\"\r\nexit /b 0\r\n"
  : "#!/bin/sh\nlast=\"\"\nfor arg in \"$@\"; do\n  last=\"$arg\"\ndone\nif [ -n \"$last\" ]; then\n  : > \"$last\"\nfi\nexit 0\n";
fs.writeFileSync(fakeFfmpegPath, fakeScript, "utf8");
fs.chmodSync(fakeFfmpegPath, 0o755);

const electronBinary = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const entryFile = path.join(repoRoot, "dist", "src", "main", "main.js");

const child = spawn(electronBinary, [entryFile], {
  cwd: repoRoot,
  env: {
    ...process.env,
    MI_CUT_SMOKE_TEST: "1",
    MI_CUT_STORAGE_ROOT: storageRoot,
    MI_CUT_SMOKE_VIDEO_PATH: smokeVideoPath,
    FFMPEG_PATH: fakeFfmpegPath,
  },
  stdio: "inherit",
});

const timer = setTimeout(() => {
  child.kill("SIGTERM");
}, 30000);

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // ignore cleanup issues
  }

  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 1);
});
