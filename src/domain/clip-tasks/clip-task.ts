export type ClipTaskStatus = "pending" | "processing" | "success" | "failed";

export interface ClipTaskItem {
  id: string;
  taskId: string;
  markerId: string;
  startSeconds: number;
  endSeconds: number;
  outputFile: string | null;
  status: ClipTaskStatus;
  errorMessage: string | null;
}

export interface ClipTask {
  id: string;
  projectId: string;
  beforeSeconds: number;
  afterSeconds: number;
  status: ClipTaskStatus;
  errorMessage: string | null;
  outputDir: string | null;
  createdAt: string;
  items: ClipTaskItem[];
}

export interface ClipTaskResultItemView {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: ClipTaskStatus;
  errorMessage: string;
  videoUrl?: string;
}

export interface ClipTaskSummaryView {
  id: string;
  status: ClipTaskStatus;
  errorMessage: string | null;
  createdAt: string;
  outputDir: string | null;
}

export interface ClipTaskDetailView extends ClipTaskSummaryView {
  results: ClipTaskResultItemView[];
}
