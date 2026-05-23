import { getClipRule } from "../app/clip-rules/get-clip-rule.js";
import { updateClipRule } from "../app/clip-rules/update-clip-rule.js";
import { createClipTask } from "../app/clip-tasks/create-clip-task.js";
import { getClipTask } from "../app/clip-tasks/get-clip-task.js";
import { listClipTasks } from "../app/clip-tasks/list-clip-tasks.js";
import { runClipTask } from "../app/clip-tasks/run-clip-task.js";
import { createMarker } from "../app/markers/create-marker.js";
import { deleteMarker } from "../app/markers/delete-marker.js";
import { importExcelMarkers } from "../app/markers/import-excel-markers.js";
import { listMarkers } from "../app/markers/list-markers.js";
import { bindProjectVideo } from "../app/projects/bind-project-video.js";
import { createProject } from "../app/projects/create-project.js";
import { getProject } from "../app/projects/get-project.js";
import { listProjects } from "../app/projects/list-projects.js";
import { XlsxMarkerImporter } from "../adapters/importers/xlsx-marker-importer.js";
import { BasicVideoInspector } from "../adapters/media/basic-video-inspector.js";
import { resolveAppPaths } from "../adapters/runtime/storage-paths.js";
import { FfmpegClipRunner } from "../adapters/runtime/ffmpeg-clip-runner.js";
import { emitTaskUpdated } from "./task-events.js";
import { SqliteClipRuleRepository } from "../adapters/sqlite/sqlite-clip-rule-repository.js";
import { createSqliteContext } from "../adapters/sqlite/sqlite-database.js";
import { SqliteClipTaskRepository } from "../adapters/sqlite/sqlite-clip-task-repository.js";
import { SqliteMarkerRepository } from "../adapters/sqlite/sqlite-marker-repository.js";
import { SqliteProjectRepository } from "../adapters/sqlite/sqlite-project-repository.js";
import { SystemClock } from "../shared/clock.js";
import { TimestampIdGenerator } from "../shared/id-generator.js";

export function createMainServices(storageRoot: string) {
  const paths = resolveAppPaths(storageRoot);
  const sqliteContext = createSqliteContext(paths);
  const projectRepository = new SqliteProjectRepository(sqliteContext);
  const markerRepository = new SqliteMarkerRepository(sqliteContext);
  const clipRuleRepository = new SqliteClipRuleRepository(sqliteContext);
  const clipTaskRepository = new SqliteClipTaskRepository(sqliteContext);
  const markerImporter = new XlsxMarkerImporter();
  const videoInspector = new BasicVideoInspector();
  const clipRunner = new FfmpegClipRunner(paths, clipTaskRepository, emitTaskUpdated);
  const clock = new SystemClock();
  const idGenerator = new TimestampIdGenerator();

  return {
    paths,
    listProjects: () => listProjects({ projectRepository, markerRepository }),
    createProject: (name: string) => createProject({ projectRepository, markerRepository, idGenerator, clock }, name),
    getProject: (projectId: string) => getProject({ projectRepository, markerRepository }, projectId),
    bindProjectVideo: (projectId: string, videoPath: string) => bindProjectVideo({ projectRepository, markerRepository, videoInspector }, projectId, videoPath),
    listMarkers: (projectId: string) => listMarkers({ markerRepository }, projectId),
    createMarker: (input: { projectId: string; timestamp: number; description: string }) =>
      createMarker({ projectRepository, markerRepository, idGenerator, clock }, input),
    deleteMarker: (projectId: string, markerId: string) => deleteMarker({ markerRepository }, projectId, markerId),
    importExcelMarkers: (projectId: string, input: string | Buffer) =>
      importExcelMarkers({ projectRepository, markerRepository, markerImporter, idGenerator, clock }, projectId, input),
    getClipRule: (projectId: string) => getClipRule({ clipRuleRepository }, projectId),
    updateClipRule: (projectId: string, beforeSeconds: number, afterSeconds: number) =>
      updateClipRule({ clipRuleRepository, clock }, projectId, beforeSeconds, afterSeconds),
    createClipTask: (projectId: string) =>
      createClipTask({ projectRepository, markerRepository, clipRuleRepository, clipTaskRepository, idGenerator, clock }, projectId),
    listClipTasks: (projectId: string) => listClipTasks({ clipTaskRepository }, projectId),
    getClipTask: (taskId: string) => getClipTask({ clipTaskRepository }, taskId),
    runClipTask: (taskId: string) =>
      runClipTask({ clipTaskRepository, projectRepository, markerRepository, clipRuleRepository, clipRunner }, taskId),
  };
}
