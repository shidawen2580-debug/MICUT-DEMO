import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, protocol } from "electron";
import { createMainServices } from "./composition-root.js";
import { registerIpcHandlers } from "./ipc/register-ipc-handlers.js";

let mainWindow: BrowserWindow | null = null;
const isSmokeTest = process.env.MI_CUT_SMOKE_TEST === "1";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

function resolveProjectRoot(): string {
  return path.resolve(currentDirPath, "..", "..", "..");
}

function resolvePreloadPath(): string {
  return path.join(resolveProjectRoot(), "dist", "src", "preload", "preload.cjs");
}

function resolveRendererPath(): string {
  return path.join(resolveProjectRoot(), "src", "renderer", "index.html");
}

function resolveStorageRoot(): string {
  if (process.env.MI_CUT_STORAGE_ROOT) {
    return path.resolve(process.env.MI_CUT_STORAGE_ROOT);
  }

  return path.join(app.getPath("userData"), "storage");
}

function getVideoContentType(videoPath: string): string | null {
  const ext = path.extname(videoPath).toLowerCase();
  switch (ext) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".ogg":
      return "video/ogg";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    case ".avi":
      return "video/x-msvideo";
    default:
      return null;
  }
}

function encodeVideoPathForProtocol(videoPath: string): string {
  return Buffer.from(videoPath, "utf8").toString("base64url");
}

function decodeVideoPathFromProtocol(encodedPath: string): string {
  return Buffer.from(encodedPath, "base64url").toString("utf8");
}

export function buildAppVideoUrl(videoPath: string): string {
  const normalizedPath = path.normalize(videoPath);
  return `app-video://local/${encodeVideoPathForProtocol(normalizedPath)}`;
}

function registerVideoProtocol(): void {
  protocol.handle("app-video", async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== "local") {
        return new Response("Not Found", { status: 404 });
      }

      const encodedPath = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      if (!encodedPath) {
        return new Response("Bad Request", { status: 400 });
      }

      const decodedPath = decodeVideoPathFromProtocol(encodedPath);
      const normalizedPath = path.normalize(decodedPath);
      if (!path.isAbsolute(normalizedPath)) {
        return new Response("非法视频路径", { status: 400 });
      }

      let realPath: string;
      try {
        realPath = fs.realpathSync(normalizedPath);
      } catch {
        return new Response("视频文件不存在", { status: 404 });
      }

      const stat = fs.statSync(realPath);
      if (!stat.isFile()) {
        return new Response("非法视频路径", { status: 400 });
      }

      const contentType = getVideoContentType(realPath);
      if (!contentType) {
        return new Response("不支持的视频格式", { status: 400 });
      }

      const range = request.headers.get("range");
      const fileSize = stat.size;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        const start = Number.parseInt(match[1] ?? "0", 10);
        const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
        if (!Number.isFinite(start) || !Number.isFinite(requestedEnd)) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }
        const end = Math.min(requestedEnd, fileSize - 1);
        if (start >= fileSize || end < start) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        const stream = fs.createReadStream(realPath, { start, end });
        return new Response(stream as any, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Content-Length": String(end - start + 1),
          },
        });
      }

      return new Response(fs.createReadStream(realPath) as any, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
        },
      });
    } catch {
      return new Response("视频流读取失败", { status: 500 });
    }
  });
}

function createWindow(): BrowserWindow {
  const preloadPath = resolvePreloadPath();
  if (isSmokeTest) {
    console.log(`[mi-cut:smoke] preload path: ${preloadPath}`);
    console.log(`[mi-cut:smoke] renderer path: ${resolveRendererPath()}`);
  }

  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isSmokeTest) {
    window.webContents.once("dom-ready", () => {
      void window.webContents.executeJavaScript(`document.body.dataset.smokeMode = "true";`);
    });
  }

  void window.loadFile(resolveRendererPath());
  return window;
}

async function runSmokeValidation(window: BrowserWindow): Promise<void> {
  try {
    await window.webContents.executeJavaScript(`
      (async () => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const waitFor = async (predicate, message, timeout = 4000) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if (predicate()) {
              return;
            }
            await sleep(100);
          }
          throw new Error(message);
        };

        const get = (selector) => document.querySelector(selector);
        const getAll = (selector) => Array.from(document.querySelectorAll(selector));

        await waitFor(() => document.body.dataset.smokeRendererBooted === "true", "renderer script did not boot");
        await waitFor(
          () => document.body.dataset.smokeRendererLoaded === "true",
          document.body.dataset.smokeRendererError || "renderer script did not finish",
        );
        await waitFor(() => document.body.dataset.smokeProjectsView === "true", "projects view not active");

        const input = get("#new-project-name");
        const createButton = get("#create-project-btn");
        if (!(input instanceof HTMLInputElement) || !(createButton instanceof HTMLElement)) {
          throw new Error("project creation controls missing");
        }

        input.value = "Smoke Project";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        createButton.click();

        await waitFor(() => getAll(".project-card").length > 0, "project card was not rendered");
        const firstCard = getAll(".project-card").find((card) => (card.textContent || "").includes("Smoke Project"));
        if (!(firstCard instanceof HTMLElement)) {
          throw new Error("project card missing");
        }
        firstCard.click();

        await waitFor(() => !!get("#workbench-view.active"), "workbench view not active");
        await waitFor(() => !!get("#select-video-btn"), "select video button missing");
        await waitFor(() => !!get("#start-task-btn"), "start task button missing");
        await waitFor(() => !!get("#marker-list"), "marker list missing");

        const selectVideoButton = get("#select-video-btn");
        if (!(selectVideoButton instanceof HTMLElement)) {
          throw new Error("select video button missing");
        }
        selectVideoButton.click();
        await waitFor(() => (get("#video-path")?.textContent || "").includes("smoke-video.mp4"), "video path did not update");

        const preMarkerTaskButton = get("#start-task-btn");
        if (!(preMarkerTaskButton instanceof HTMLElement)) {
          throw new Error("start task button missing before marker validation");
        }
        preMarkerTaskButton.click();
        await waitFor(() => (get("#message-bar")?.textContent || "").includes("NO_MARKERS") || (get("#message-bar")?.textContent || "").includes("启动任务失败"), "missing no-markers exception feedback", 4000);

        const addMarkerButton = get("#add-marker-btn");
        if (!(addMarkerButton instanceof HTMLElement)) {
          throw new Error("add marker button missing");
        }
        addMarkerButton.click();
        await waitFor(() => getAll(".marker-item").length > 0, "marker item was not created");

        const currentTimeNode = get("#current-time");
        const seekBackwardButton = get("#seek-backward-btn");
        const seekForwardButton = get("#seek-forward-btn");
        const seekLatestMarkerButton = get("#seek-latest-marker-btn");
        if (!(currentTimeNode instanceof HTMLElement) || !(seekBackwardButton instanceof HTMLElement) || !(seekForwardButton instanceof HTMLElement) || !(seekLatestMarkerButton instanceof HTMLElement)) {
          throw new Error("preview control buttons missing");
        }

        seekForwardButton.click();
        seekBackwardButton.click();
        seekLatestMarkerButton.click();
        await waitFor(() => (get("#message-bar")?.textContent || "").includes("已跳转到最新打点") || (get("#message-bar")?.textContent || "").includes("打点"), "seek latest marker feedback missing", 4000);

        const startTaskButton = get("#start-task-btn");
        if (!(startTaskButton instanceof HTMLElement)) {
          throw new Error("start task button missing");
        }
        startTaskButton.click();
        await waitFor(() => (get("#task-status-panel")?.textContent || "").includes("当前任务状态"), "task panel did not render");
        await waitFor(() => (get("#task-status-panel")?.textContent || "").includes("导出目录"), "task export card did not render", 8000);

        const openOutputButton = get("#open-output-btn");
        const copyOutputButton = get("#copy-output-btn");
        if (!(openOutputButton instanceof HTMLButtonElement)) {
          throw new Error("open output button missing");
        }
        if (!(copyOutputButton instanceof HTMLButtonElement)) {
          throw new Error("copy output button missing");
        }
        const activeTaskId = document.body.dataset.smokeActiveTaskId || "";
        if (activeTaskId && window.miCut?.clipTasks?.get) {
          const currentTask = await window.miCut.clipTasks.get(activeTaskId);
          console.log("[mi-cut:smoke] current task detail", JSON.stringify(currentTask));
          const detail = currentTask?.ok ? currentTask.value : currentTask;
          if (!detail || detail.status !== "success") {
            throw new Error("task detail did not settle to success");
          }
          if ((detail.results?.length || 0) !== 1) {
            throw new Error("unexpected result count: " + (detail.results?.length || 0));
          }
          if (detail.errorMessage) {
            throw new Error("task detail still has errorMessage: " + detail.errorMessage);
          }
          if (!detail.outputDir) {
            throw new Error("task detail missing outputDir");
          }
        }
        await waitFor(
          () => !openOutputButton.disabled,
          "open output button stayed disabled :: " + ((get("#task-status-panel")?.textContent || "").slice(0, 300)),
          15000,
        );
        if (copyOutputButton.disabled) {
          throw new Error("copy output button stayed disabled");
        }
        copyOutputButton.click();
        openOutputButton.click();

        const backToProjectsButton = get("#back-to-projects");
        if (!(backToProjectsButton instanceof HTMLElement)) {
          throw new Error("back to projects button missing");
        }
        backToProjectsButton.click();
        await waitFor(() => !!get("#projects-view.active"), "projects view did not reactivate", 4000);

        const reopenedCard = getAll(".project-card")[0];
        if (!(reopenedCard instanceof HTMLElement)) {
          throw new Error("project card missing after returning to projects");
        }
        reopenedCard.click();
        await waitFor(() => !!get("#workbench-view.active"), "workbench did not reopen after returning", 4000);
        await waitFor(() => (get("#task-history-summary")?.textContent || "").includes("共"), "task history summary missing after reopen", 4000);
        await waitFor(() => (get("#task-status-panel")?.textContent || "").includes("本次任务已完成") || (get("#task-status-panel")?.textContent || "").includes("导出目录"), "task result context missing after reopen", 4000);

        const reopenedOpenOutputButton = get("#open-output-btn");
        const reopenedCopyOutputButton = get("#copy-output-btn");
        if (!(reopenedOpenOutputButton instanceof HTMLButtonElement) || !(reopenedCopyOutputButton instanceof HTMLButtonElement)) {
          throw new Error("output action buttons missing after reopen");
        }
        if (reopenedOpenOutputButton.disabled || reopenedCopyOutputButton.disabled) {
          throw new Error("output action buttons not available after reopen");
        }

        const backAgainButton = get("#back-to-projects");
        if (!(backAgainButton instanceof HTMLElement)) {
          throw new Error("back to projects button missing on second pass");
        }
        backAgainButton.click();
        await waitFor(() => !!get("#projects-view.active"), "projects view did not reactivate on second return", 4000);

        const topCreateProjectButton = get("#create-project-top");
        if (!(topCreateProjectButton instanceof HTMLElement)) {
          throw new Error("top create project button missing");
        }
        topCreateProjectButton.click();
        await waitFor(() => document.activeElement === input, "top create project shortcut did not focus input", 4000);

        const beforeSecondsInput = get("#before-seconds");
        const afterSecondsInput = get("#after-seconds");
        const saveRuleButton = get("#save-rule-btn");
        if (!(beforeSecondsInput instanceof HTMLInputElement) || !(afterSecondsInput instanceof HTMLInputElement) || !(saveRuleButton instanceof HTMLElement)) {
          throw new Error("rule controls missing");
        }
        beforeSecondsInput.value = "7";
        beforeSecondsInput.dispatchEvent(new Event("input", { bubbles: true }));
        afterSecondsInput.value = "9";
        afterSecondsInput.dispatchEvent(new Event("input", { bubbles: true }));
        saveRuleButton.click();
        await waitFor(() => (get("#message-bar")?.textContent || "").includes("规则已保存"), "rule save feedback missing", 4000);

        const secondStartTaskButton = get("#start-task-btn");
        if (!(secondStartTaskButton instanceof HTMLElement)) {
          throw new Error("second start task button missing");
        }
        secondStartTaskButton.click();
        await waitFor(() => (get("#task-history-summary")?.textContent || "").includes("共 2 条任务"), "task history did not grow to 2 items", 15000);
        await waitFor(() => getAll(".task-item").length >= 2, "task history list missing second task", 4000);

        const historyItems = getAll(".task-item");
        const secondHistoryItem = historyItems[1];
        if (!(secondHistoryItem instanceof HTMLElement)) {
          throw new Error("historical task item missing");
        }
        secondHistoryItem.click();
        await waitFor(() => (get("#task-status-panel")?.textContent || "").includes("历史任务结果"), "history task context missing after selecting old task", 4000);

        const latestHistoryItem = historyItems[0];
        if (!(latestHistoryItem instanceof HTMLElement)) {
          throw new Error("latest task item missing after second task");
        }
        latestHistoryItem.click();
        await waitFor(() => !(get("#task-status-panel")?.textContent || "").includes("历史任务结果"), "latest task context did not restore", 4000);
        await waitFor(() => Number(beforeSecondsInput.value) >= 0 && Number(afterSecondsInput.value) >= 0, "rule inputs became invalid after task switching", 4000);

        backAgainButton.click();
        await waitFor(() => !!get("#projects-view.active"), "projects view did not reactivate before second project creation", 4000);

        input.value = "Smoke Project 2";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        createButton.click();
        await waitFor(() => getAll(".project-card").length >= 2, "second project card was not rendered", 4000);

        const secondProjectCard = getAll(".project-card").find((card) => (card.textContent || "").includes("Smoke Project 2"));
        if (!(secondProjectCard instanceof HTMLElement)) {
          throw new Error("second project card missing");
        }
        secondProjectCard.click();
        await waitFor(() => !!get("#workbench-view.active"), "second project workbench did not open", 4000);
        await waitFor(() => (get("#video-path")?.textContent || "") === "未绑定视频", "second project unexpectedly inherited video binding", 4000);
        await waitFor(() => (get("#task-history-summary")?.textContent || "").includes("暂无任务"), "second project unexpectedly inherited task history", 4000);
        await waitFor(() => getAll(".marker-item").length === 0, "second project unexpectedly inherited markers", 4000);

        const secondProjectSelectVideoButton = get("#select-video-btn");
        if (!(secondProjectSelectVideoButton instanceof HTMLElement)) {
          throw new Error("second project select video button missing");
        }
        secondProjectSelectVideoButton.click();
        await waitFor(() => (get("#video-path")?.textContent || "").includes("smoke-video.mp4"), "second project video path did not update", 4000);

        await waitFor(() => (get("#task-readiness")?.textContent || "").includes("视频就绪"), "second project readiness did not reflect video binding", 4000);

        const secondProjectAddMarkerButton = get("#add-marker-btn");
        if (!(secondProjectAddMarkerButton instanceof HTMLElement)) {
          throw new Error("second project add marker button missing");
        }
        secondProjectAddMarkerButton.click();
        await waitFor(() => getAll(".marker-item").length > 0, "second project marker was not created", 4000);
        await waitFor(() => (get("#task-readiness")?.textContent || "").includes("打点已准备"), "second project readiness did not reflect marker creation", 4000);

        const secondProjectStartTaskButtonReady = get("#start-task-btn");
        if (!(secondProjectStartTaskButtonReady instanceof HTMLElement)) {
          throw new Error("second project start task button missing before ready-state task");
        }
        secondProjectStartTaskButtonReady.click();
        await waitFor(() => (get("#task-history-summary")?.textContent || "").includes("共 1 条任务"), "second project task history did not grow to 1 item", 15000);
        await waitFor(() => (get("#task-status-panel")?.textContent || "").includes("本次任务已完成") || (get("#task-status-panel")?.textContent || "").includes("导出目录"), "second project task result context missing", 8000);

        const secondProjectDeleteMarkerButton = get(".marker-item [data-delete]");
        if (!(secondProjectDeleteMarkerButton instanceof HTMLElement)) {
          throw new Error("second project delete marker button missing");
        }
        secondProjectDeleteMarkerButton.click();
        await waitFor(() => getAll(".marker-item").length === 0, "second project marker was not deleted", 4000);
        await waitFor(() => (get("#task-readiness")?.textContent || "").includes("待添加打点"), "second project readiness did not regress after marker deletion", 4000);

        const secondProjectStartTaskButton = get("#start-task-btn");
        if (!(secondProjectStartTaskButton instanceof HTMLElement)) {
          throw new Error("second project start task button missing");
        }
        secondProjectStartTaskButton.click();
        await waitFor(() => (get("#message-bar")?.textContent || "").includes("NO_MARKERS") || (get("#message-bar")?.textContent || "").includes("启动任务失败"), "second project no-markers error feedback missing", 4000);

        const secondProjectBackButton = get("#back-to-projects");
        if (!(secondProjectBackButton instanceof HTMLElement)) {
          throw new Error("second project back button missing");
        }
        secondProjectBackButton.click();
        await waitFor(() => !!get("#projects-view.active"), "projects view did not reactivate after second project", 4000);

        const secondProjectCardAfterWork = getAll(".project-card").find((card) => (card.textContent || "").includes("Smoke Project 2"));
        if (!(secondProjectCardAfterWork instanceof HTMLElement)) {
          throw new Error("second project card missing after second project work");
        }
        await waitFor(() => (secondProjectCardAfterWork.textContent || "").includes("可进入工作台") || (secondProjectCardAfterWork.textContent || "").includes("Video Ready"), "second project card did not reflect ready state after work", 4000);

        const firstProjectCardAfterReturn = getAll(".project-card").find((card) => (card.textContent || "").includes("Smoke Project") && !(card.textContent || "").includes("Smoke Project 2"));
        if (!(firstProjectCardAfterReturn instanceof HTMLElement)) {
          throw new Error("first project card missing after second project work");
        }
        await waitFor(() => (firstProjectCardAfterReturn.textContent || "").includes("可进入工作台") || (firstProjectCardAfterReturn.textContent || "").includes("Video Ready"), "first project card did not retain ready state after second project work", 4000);

        const firstProjectReturnCard = getAll(".project-card").find((card) => (card.textContent || "").includes("Smoke Project") && !(card.textContent || "").includes("Smoke Project 2"));
        if (!(firstProjectReturnCard instanceof HTMLElement)) {
          throw new Error("first project card missing on return");
        }
        firstProjectReturnCard.click();
        await waitFor(() => !!get("#workbench-view.active"), "first project workbench did not reopen after second project", 4000);
        await waitFor(() => (get("#video-path")?.textContent || "").includes("smoke-video.mp4"), "first project lost its video binding after second project", 4000);
        await waitFor(() => (get("#task-history-summary")?.textContent || "").includes("共 2 条任务"), "first project lost its task history after second project", 4000);
        await waitFor(() => getAll(".marker-item").length > 0, "first project markers did not restore after second project", 4000);

        return {
          preloadReady: document.body.dataset.preloadReady === "true",
          bridgeReady: document.body.dataset.smokeBridgeReady === "true",
          projectCount: getAll(".project-card").length,
          hasWorkbench: !!get("#workbench-view.active"),
          hasSelectVideo: !!get("#select-video-btn"),
          hasStartTask: !!get("#start-task-btn"),
          hasTaskHistory: !!get("#task-history"),
          hasMarkerItems: getAll(".marker-item").length > 0,
          outputEnabled: !openOutputButton.disabled,
        };
      })();
    `);
    console.log("[mi-cut:smoke] renderer interaction validation passed");
    app.exit(0);
  } catch (error) {
    console.error("[mi-cut:smoke] renderer interaction validation failed", error);
    app.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  const services = createMainServices(resolveStorageRoot());
  registerVideoProtocol();
  registerIpcHandlers(services);
  mainWindow = createWindow();

  if (isSmokeTest && mainWindow) {
    mainWindow.webContents.once("did-finish-load", () => {
      void runSmokeValidation(mainWindow as BrowserWindow);
    });
  }
}

app.whenReady().then(() => {
  void bootstrap();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
