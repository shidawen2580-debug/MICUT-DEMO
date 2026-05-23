export const ipcChannels = {
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
} as const;
