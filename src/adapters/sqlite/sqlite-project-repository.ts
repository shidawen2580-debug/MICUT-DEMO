import type { Project, ProjectSummary } from "../../domain/projects/project.js";
import type { ProjectRepository, ProjectVideoUpdate } from "../../domain/projects/project-repository.js";
import type { SqliteContext } from "./sqlite-database.js";

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly context: SqliteContext) {}

  async list(): Promise<Project[]> {
    const rows = this.context.db
      .prepare("SELECT * FROM projects ORDER BY createdAt DESC")
      .all() as Project[];
    return rows;
  }

  async getById(projectId: string): Promise<Project | null> {
    const row = this.context.db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project | undefined;
    return row ?? null;
  }

  async create(project: Project): Promise<void> {
    this.context.db
      .prepare(`
        INSERT INTO projects (id, name, videoPath, videoName, videoDuration, videoFormat, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(project.id, project.name, project.videoPath, project.videoName, project.videoDuration, project.videoFormat, project.createdAt);
  }

  async updateVideo(projectId: string, video: ProjectVideoUpdate): Promise<void> {
    this.context.db
      .prepare(`
        UPDATE projects
        SET videoPath = ?, videoName = ?, videoDuration = ?, videoFormat = ?
        WHERE id = ?
      `)
      .run(video.videoPath, video.videoName, video.videoDuration, video.videoFormat, projectId);
  }
}
