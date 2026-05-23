# adapters

这里放外部适配层实现，用来承接业务核心之外的真实依赖。

当前主要覆盖：

- SQLite / 本地持久化
- Excel 导入
- FFmpeg / ffprobe
- 文件系统与存储路径
- Electron IPC 周边接入

这一层的目标是把外部技术细节隔离在边界内，让上层用例和领域逻辑保持稳定。
