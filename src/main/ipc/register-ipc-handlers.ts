import { dialog, ipcMain, shell } from "electron";
import type { createMainServices } from "../composition-root.js";
import { ipcChannels } from "./channels.js";
import { buildAppVideoUrl } from "../main.js";

type MainServices = ReturnType<typeof createMainServices>;
const isSmokeTest = process.env.MI_CUT_SMOKE_TEST === "1";

export function registerIpcHandlers(services: MainServices): void {
  ipcMain.handle(ipcChannels.projects.list, () => services.listProjects());
  ipcMain.handle(ipcChannels.projects.create, (_event, name: string) => services.createProject(name));
  ipcMain.handle(ipcChannels.projects.get, (_event, projectId: string) => services.getProject(projectId));
  ipcMain.handle(ipcChannels.projects.bindVideo, (_event, projectId: string, videoPath: string) =>
    services.bindProjectVideo(projectId, videoPath),
  );
  ipcMain.handle(ipcChannels.video.buildPreviewUrl, (_event, videoPath: string) => buildAppVideoUrl(videoPath));
  ipcMain.handle(ipcChannels.projects.selectVideo, async () => {
    if (isSmokeTest && process.env.MI_CUT_SMOKE_VIDEO_PATH) {
      return { ok: true, value: process.env.MI_CUT_SMOKE_VIDEO_PATH };
    }

    const selected = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Video", extensions: ["mp4", "mkv"] }],
    });

    if (selected.canceled || selected.filePaths.length === 0) {
      return { ok: false, error: "VIDEO_SELECTION_CANCELLED" };
    }

    const filePath = selected.filePaths[0];
    if (!filePath) {
      return { ok: false, error: "VIDEO_SELECTION_CANCELLED" };
    }

    return { ok: true, value: filePath };
  });

  ipcMain.handle(ipcChannels.markers.list, (_event, projectId: string) => services.listMarkers(projectId));
  ipcMain.handle(ipcChannels.markers.create, (_event, input: { projectId: string; timestamp: number; description: string }) =>
    services.createMarker(input),
  );
  ipcMain.handle(ipcChannels.markers.delete, (_event, projectId: string, markerId: string) => services.deleteMarker(projectId, markerId));
  ipcMain.handle(ipcChannels.markers.importExcel, async (_event, projectId: string) => {
    const selected = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (selected.canceled || selected.filePaths.length === 0) {
      return { ok: false, error: "IMPORT_CANCELLED" };
    }
    const filePath = selected.filePaths[0];
    if (!filePath) {
      return { ok: false, error: "IMPORT_CANCELLED" };
    }
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(filePath);
    return services.importExcelMarkers(projectId, buffer);
  });

  ipcMain.handle(ipcChannels.clipRules.get, (_event, projectId: string) => services.getClipRule(projectId));
  ipcMain.handle(ipcChannels.clipRules.update, (_event, projectId: string, payload: { beforeSeconds: number; afterSeconds: number }) =>
    services.updateClipRule(projectId, payload.beforeSeconds, payload.afterSeconds),
  );

  ipcMain.handle(ipcChannels.clipTasks.create, async (_event, projectId: string) => {
    const result = await services.createClipTask(projectId);
    if (result.ok) {
      void services.runClipTask(result.value.id);
    }
    return result;
  });
  ipcMain.handle(ipcChannels.clipTasks.list, (_event, projectId: string) => services.listClipTasks(projectId));
  ipcMain.handle(ipcChannels.clipTasks.get, (_event, taskId: string) => services.getClipTask(taskId));
  ipcMain.handle(ipcChannels.clipTasks.run, (_event, taskId: string) => services.runClipTask(taskId));
  ipcMain.handle(ipcChannels.clipTasks.openOutputDir, async (_event, outputDir: string | null) => {
    if (!outputDir) {
      return { ok: false, error: "OUTPUT_DIR_MISSING" };
    }

    if (isSmokeTest) {
      return { ok: true, value: outputDir };
    }

    const result = await shell.openPath(outputDir);
    if (result) {
      return { ok: false, error: result };
    }

    return { ok: true, value: outputDir };
  });
}
