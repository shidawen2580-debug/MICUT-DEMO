export interface MiCutApi {
  app: {
    onTaskUpdated(listener: (payload: { taskId: string; status: string }) => void): () => void;
  };
  projects: {
    list(): Promise<unknown>;
    create(name: string): Promise<unknown>;
    get(projectId: string): Promise<unknown>;
    bindVideo(projectId: string, videoPath: string): Promise<unknown>;
    selectVideo(): Promise<unknown>;
  };
  video: {
    buildPreviewUrl(videoPath: string): Promise<string>;
  };
  markers: {
    list(projectId: string): Promise<unknown>;
    create(input: { projectId: string; timestamp: number; description: string }): Promise<unknown>;
    delete(projectId: string, markerId: string): Promise<unknown>;
    importExcel(projectId: string): Promise<unknown>;
  };
  clipRules: {
    get(projectId: string): Promise<unknown>;
    update(projectId: string, payload: { beforeSeconds: number; afterSeconds: number }): Promise<unknown>;
  };
  clipTasks: {
    create(projectId: string): Promise<unknown>;
    list(projectId: string): Promise<unknown>;
    get(taskId: string): Promise<unknown>;
    run(taskId: string): Promise<unknown>;
    openOutputDir(outputDir: string | null): Promise<unknown>;
  };
}

declare global {
  interface Window {
    miCut: MiCutApi;
  }
}

export {};
