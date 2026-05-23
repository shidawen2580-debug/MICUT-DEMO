import { BrowserWindow } from "electron";
import { ipcChannels } from "./ipc/channels.js";

export interface TaskUpdatedPayload {
  taskId: string;
  status: string;
}

export function emitTaskUpdated(payload: TaskUpdatedPayload): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcChannels.app.taskUpdated, payload);
  }
}
