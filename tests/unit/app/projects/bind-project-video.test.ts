import test from "node:test";
import assert from "node:assert/strict";
import { bindProjectVideo } from "../../../../src/app/projects/bind-project-video.js";

test("bindProjectVideo updates project metadata for supported local file", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const result = await bindProjectVideo(
    {
      projectRepository: {
        async list() {
          return [];
        },
        async getById(projectId) {
          return {
            id: projectId,
            name: "project",
            videoPath: null,
            videoName: null,
            videoDuration: null,
            videoFormat: null,
            createdAt: "2026-05-22T00:00:00.000Z",
          };
        },
        async create() {
          return undefined;
        },
        async updateVideo(projectId, video) {
          updates.push({ projectId, ...video });
        },
      },
      markerRepository: {
        async listByProjectId() {
          return [];
        },
        async getById() {
          return null;
        },
        async create() {
          return undefined;
        },
        async createMany() {
          return undefined;
        },
        async delete() {
          return undefined;
        },
        async countByProjectId() {
          return 0;
        },
      },
      videoInspector: {
        async inspect(filePath) {
          return {
            path: filePath,
            name: "video.mp4",
            durationSeconds: 120,
            format: "mp4",
          };
        },
      },
    },
    "project_1",
    new URL("../../../../package.json", import.meta.url).pathname,
  );

  assert.equal(result.ok, false);
  assert.equal(updates.length, 0);
});
