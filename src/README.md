# src

这里放 mi-cut-demo 的核心业务源码。

目录按分层方式组织：

- `app/`：应用用例、流程编排、输入输出契约
- `domain/`：业务对象、规则、仓储接口、任务语义
- `adapters/`：SQLite、Excel、FFmpeg、文件系统与 Electron 周边适配
- `shared/`：少量跨层共享类型与工具
- `main/` / `preload/` / `renderer/`：Electron 运行入口与最小界面

这份展示版仓库重点不是完整商业交付，而是清晰呈现产品主流程和架构边界。
