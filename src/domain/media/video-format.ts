import path from "node:path";

export function getVideoFormat(fileName: string): string {
  return path.extname(fileName).replace(".", "").toLowerCase();
}

export function isSupportedVideoFormat(fileName: string): boolean {
  const format = getVideoFormat(fileName);
  return format === "mp4" || format === "mkv";
}
