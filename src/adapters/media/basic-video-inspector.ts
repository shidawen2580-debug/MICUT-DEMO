import path from "node:path";
import type { VideoInspector } from "../../domain/media/video-inspector.js";
import type { VideoMetadata } from "../../domain/media/video-metadata.js";
import { getVideoFormat } from "../../domain/media/video-format.js";

export class BasicVideoInspector implements VideoInspector {
  async inspect(filePath: string): Promise<VideoMetadata> {
    return {
      path: path.normalize(filePath),
      name: path.basename(filePath),
      durationSeconds: null,
      format: getVideoFormat(filePath),
    };
  }
}
