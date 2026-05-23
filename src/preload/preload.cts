const { contextBridge, ipcRenderer } = require("electron");

const ipcChannels = {
  app: {
    taskUpdated: "app:task-updated",
  },
  projects: {
    list: "projects:list",
    create: "projects:create",
    get: "projects:get",
    bindVideo: "projects:bind-video",
    selectVideo: "projects:select-video",
  },
  video: {
    buildPreviewUrl: "video:build-preview-url",
  },
  markers: {
    list: "markers:list",
    create: "markers:create",
    delete: "markers:delete",
    importExcel: "markers:import-excel",
  },
  clipRules: {
    get: "clip-rules:get",
    update: "clip-rules:update",
  },
  clipTasks: {
    create: "clip-tasks:create",
    list: "clip-tasks:list",
    get: "clip-tasks:get",
    run: "clip-tasks:run",
    openOutputDir: "clip-tasks:open-output-dir",
  },
};

window.addEventListener("DOMContentLoaded", () => {
  if (document?.body) {
    document.body.dataset.preloadReady = "true";
  }
});

const miCut = {
  app: {
    onTaskUpdated: (listener: (payload: { taskId: string; status: string }) => void) => {
      const wrapped = (_event: unknown, payload: { taskId: string; status: string }) => listener(payload);
      ipcRenderer.on(ipcChannels.app.taskUpdated, wrapped);
      return () => ipcRenderer.removeListener(ipcChannels.app.taskUpdated, wrapped);
    },
  },
  projects: {
    list: () => ipcRenderer.invoke(ipcChannels.projects.list),
    create: (name: string) => ipcRenderer.invoke(ipcChannels.projects.create, name),
    get: (projectId: string) => ipcRenderer.invoke(ipcChannels.projects.get, projectId),
    bindVideo: (projectId: string, videoPath: string) => ipcRenderer.invoke(ipcChannels.projects.bindVideo, projectId, videoPath),
    selectVideo: () => ipcRenderer.invoke(ipcChannels.projects.selectVideo),
  },
  markers: {
    list: (projectId: string) => ipcRenderer.invoke(ipcChannels.markers.list, projectId),
    create: (input: { projectId: string; timestamp: number; description: string }) => ipcRenderer.invoke(ipcChannels.markers.create, input),
    delete: (projectId: string, markerId: string) => ipcRenderer.invoke(ipcChannels.markers.delete, projectId, markerId),
    importExcel: (projectId: string) => ipcRenderer.invoke(ipcChannels.markers.importExcel, projectId),
  },
  clipRules: {
    get: (projectId: string) => ipcRenderer.invoke(ipcChannels.clipRules.get, projectId),
    update: (projectId: string, payload: { beforeSeconds: number; afterSeconds: number }) =>
      ipcRenderer.invoke(ipcChannels.clipRules.update, projectId, payload),
  },
  video: {
    buildPreviewUrl: (videoPath: string) => ipcRenderer.invoke(ipcChannels.video.buildPreviewUrl, videoPath),
  },
  clipTasks: {
    create: (projectId: string) => ipcRenderer.invoke(ipcChannels.clipTasks.create, projectId),
    list: (projectId: string) => ipcRenderer.invoke(ipcChannels.clipTasks.list, projectId),
    get: (taskId: string) => ipcRenderer.invoke(ipcChannels.clipTasks.get, taskId),
    run: (taskId: string) => ipcRenderer.invoke(ipcChannels.clipTasks.run, taskId),
    openOutputDir: (outputDir: string | null) => ipcRenderer.invoke(ipcChannels.clipTasks.openOutputDir, outputDir),
  },
};

contextBridge.exposeInMainWorld("miCut", miCut);
