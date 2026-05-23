# mi-cut-demo

mi-cut-demo 是一个面向 **实车测试 / 车载复盘** 场景的 Electron 桌面工具展示仓库。

它聚焦一个很具体的现场问题：当测试人员需要从长视频里围绕关键事件快速沉淀证据片段时，传统的“手记时间点 + 手工剪视频”流程既慢又容易出错。这个项目把流程收敛成一条本地优先的工作链路：**绑定视频 → 记录打点 → 配置剪辑规则 → 批量导出证据片段**。

这个仓库适合用于展示三件事：

- 真实业务问题如何被抽象成产品能力
- 一线测试场景下的视频证据生产工作流
- harness 风格的分层组织方式如何支撑 Electron 桌面应用演化

## TL;DR

- **场景**：实车测试 / 安全复盘 / 长视频证据提取
- **能力**：视频绑定、事件打点、Excel 导入、规则配置、批量剪辑
- **形态**：本地优先的 Electron 桌面应用
- **架构**：domain / app / adapters / Electron shell 分层
- **验证**：保留最小单元测试与 Electron smoke 脚本

## 核心价值

- **面向真实场景**：服务于安全员、复盘人员、测试人员从车载长视频中提取关键事件证据片段。
- **减少重复劳动**：支持手动打点和 Excel 打点导入，降低重复录入成本。
- **批量化交付**：通过统一前后置秒数规则，把分散事件点一次性转成一组可交付的视频片段。
- **本地优先**：核心链路围绕本地文件、SQLite、FFmpeg 和桌面应用完成，不依赖云端服务。
- **可演化架构**：把 domain / app / adapters / Electron 壳分开，便于继续扩展预览、任务编排和交付能力。

## 当前展示内容

- `src/`：核心源码，包含领域模型、应用用例、适配层和 Electron 入口
- `tests/`：最小单元测试样例
- `scripts/electron-smoke.mjs`：用于验证基本 Electron 启动与主流程烟测的脚本
- `PRODUCT-SNAPSHOT.md`：项目定位、用户旅程和 MVP 范围说明
- `ARCHITECTURE.md`：分层结构与 harness 风格架构说明
- `GITHUB-ABOUT.md`：可直接用于 GitHub 仓库简介与 topics 的文案建议

## 技术栈

- TypeScript
- Electron
- better-sqlite3
- xlsx
- FFmpeg / ffprobe（通过适配层接入）

## 项目结构

```text
src/
  app/        # 应用用例与编排
  domain/     # 领域对象、规则、仓储接口、任务语义
  adapters/   # SQLite、Excel、FFmpeg、文件系统等外部适配
  main/       # Electron 主进程与 IPC 注册
  preload/    # Electron preload bridge
  renderer/   # 最小 renderer 界面
  shared/     # 少量跨层共享类型与工具
tests/
scripts/
```

## 本地运行

```bash
npm install
npm run typecheck
npm test
npm run build
npm run electron:open
```

如需运行最小烟测：

```bash
npm run electron:smoke
```

## 为什么它适合做公开展示

这个仓库不是从“先想做个 demo”开始，而是从真实测试场景的效率问题长出来的。它的展示重点也不是堆砌复杂功能，而是把一个清晰可解释的现场工作流，用相对克制、可演化的桌面应用结构表达出来。

如果你关注的是以下方向，这个项目会比较有参考价值：

- 面向垂直场景的工具型产品原型
- Electron + TypeScript 的本地优先应用组织方式
- vibecoding 语境下如何先把真实流程跑通，再逐步收口架构边界

## 说明

这是一个公开展示版仓库，已经去除了内部控制面、工作流状态文件、打包产物和本机环境痕迹。它保留的是最能体现项目价值、产品主流程和架构思路的最小可运行集合。
