import type { ClipTask, ClipTaskItem, ClipTaskStatus } from "../../domain/clip-tasks/clip-task.js";
import type { ClipTaskRepository } from "../../domain/clip-tasks/clip-task-repository.js";
import type { SqliteContext } from "./sqlite-database.js";

type ClipTaskRow = Omit<ClipTask, "items">;

export class SqliteClipTaskRepository implements ClipTaskRepository {
  constructor(private readonly context: SqliteContext) {}

  async create(task: ClipTask): Promise<void> {
    const insertTask = this.context.db.prepare(`
      INSERT INTO clip_tasks (id, projectId, beforeSeconds, afterSeconds, status, errorMessage, outputDir, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = this.context.db.prepare(`
      INSERT INTO clip_task_items (id, taskId, markerId, startSeconds, endSeconds, outputFile, status, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.context.db.transaction((currentTask: ClipTask) => {
      insertTask.run(
        currentTask.id,
        currentTask.projectId,
        currentTask.beforeSeconds,
        currentTask.afterSeconds,
        currentTask.status,
        currentTask.errorMessage,
        currentTask.outputDir,
        currentTask.createdAt,
      );

      for (const item of currentTask.items) {
        insertItem.run(
          item.id,
          item.taskId,
          item.markerId,
          item.startSeconds,
          item.endSeconds,
          item.outputFile,
          item.status,
          item.errorMessage,
        );
      }
    });

    transaction(task);
  }

  async getById(taskId: string): Promise<ClipTask | null> {
    const row = this.context.db.prepare("SELECT * FROM clip_tasks WHERE id = ?").get(taskId) as ClipTaskRow | undefined;
    if (!row) {
      return null;
    }

    return {
      ...row,
      items: this.listItems(taskId),
    };
  }

  async listByProjectId(projectId: string): Promise<ClipTask[]> {
    const rows = this.context.db.prepare("SELECT * FROM clip_tasks WHERE projectId = ? ORDER BY createdAt DESC").all(projectId) as ClipTaskRow[];
    return rows.map((row) => ({
      ...row,
      items: this.listItems(row.id),
    }));
  }

  async updateTaskStatus(
    taskId: string,
    status: ClipTaskStatus,
    updates?: { errorMessage?: string | null; outputDir?: string | null },
  ): Promise<void> {
    const current = this.context.db.prepare("SELECT * FROM clip_tasks WHERE id = ?").get(taskId) as ClipTaskRow | undefined;
    if (!current) {
      return;
    }

    this.context.db
      .prepare(`
        UPDATE clip_tasks
        SET status = ?, errorMessage = ?, outputDir = ?
        WHERE id = ?
      `)
      .run(status, updates?.errorMessage ?? current.errorMessage, updates?.outputDir ?? current.outputDir, taskId);
  }

  async updateItem(item: ClipTaskItem): Promise<void> {
    this.context.db
      .prepare(`
        UPDATE clip_task_items
        SET taskId = ?, markerId = ?, startSeconds = ?, endSeconds = ?, outputFile = ?, status = ?, errorMessage = ?
        WHERE id = ?
      `)
      .run(item.taskId, item.markerId, item.startSeconds, item.endSeconds, item.outputFile, item.status, item.errorMessage, item.id);
  }

  async updateItemStatus(
    itemId: string,
    status: ClipTaskStatus,
    updates?: { errorMessage?: string | null; outputFile?: string | null; startSeconds?: number; endSeconds?: number },
  ): Promise<void> {
    const current = this.context.db.prepare("SELECT * FROM clip_task_items WHERE id = ?").get(itemId) as ClipTaskItem | undefined;
    if (!current) {
      return;
    }

    this.context.db
      .prepare(`
        UPDATE clip_task_items
        SET status = ?, errorMessage = ?, outputFile = ?, startSeconds = ?, endSeconds = ?
        WHERE id = ?
      `)
      .run(
        status,
        updates?.errorMessage ?? current.errorMessage,
        updates?.outputFile ?? current.outputFile,
        updates?.startSeconds ?? current.startSeconds,
        updates?.endSeconds ?? current.endSeconds,
        itemId,
      );
  }

  private listItems(taskId: string): ClipTaskItem[] {
    return this.context.db
      .prepare("SELECT * FROM clip_task_items WHERE taskId = ? ORDER BY rowid ASC")
      .all(taskId) as ClipTaskItem[];
  }
}
