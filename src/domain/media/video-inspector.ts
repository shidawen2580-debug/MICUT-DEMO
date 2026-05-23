import type { VideoMetadata } from "./video-metadata.js";

export interface VideoInspector {
  inspect(filePath: string): Promise<VideoMetadata>;
}
