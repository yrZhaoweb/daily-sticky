# Daily Sticky

Daily Sticky 是一个纯本地的 macOS Markdown 便利贴应用。它默认置顶显示，不需要登录，不依赖云端服务，适合按日期记录每天的临时想法、待办和会议笔记。

## 特性

- macOS 原生桌面窗口，默认置顶，可随时取消置顶
- 支持同时打开多张便利贴，并放到屏幕任意位置或一键吸附到四个角落
- 每个窗口可以独立切换日期，右侧 `+` 才会新建便利贴窗口
- 同一天的数据只有一份，多个窗口打开同一日期时会自动同步内容
- 按 `YYYY-MM-DD` 存储每天的便利贴内容
- 支持 Markdown 编辑与预览，包含 GFM 表格和 checklist
- Notion 风格 `/` 命令，可快速插入标题、待办、列表、编号列表、表格、引用、代码块和分割线
- 顶部插入菜单可把当前行转换为正文、标题、待办、列表、引用等块
- 自动保存到本机 Electron 用户数据目录

## 技术栈

- Electron
- React
- TypeScript
- electron-vite
- electron-store
- react-markdown + remark-gfm
- Vitest

## 环境要求

- macOS
- Node.js 20 或更高版本
- npm

## 本地运行

```bash
npm install
npm run dev
```

## 测试与类型检查

```bash
npm test
npm run typecheck
```

## 打包 macOS App

```bash
npm run package:mac
open "dist/mac-arm64/Daily Sticky.app"
```

打包产物会生成在 `dist/mac-arm64/Daily Sticky.app`。当前项目默认使用 ad-hoc 签名，适合本机开发和自用测试；如果要正式分发，需要补充开发者证书、图标和 notarization 配置。

## 编辑器用法

- 输入 `/` 打开块命令菜单
- `Enter` 会延续 checklist、项目符号列表和编号列表
- 在空 checklist 或空列表项里按 `Enter` 会退出当前列表
- `Tab` / `Shift+Tab` 调整当前行缩进
- `Cmd/Ctrl+B` 加粗或取消加粗
- `Cmd/Ctrl+I` 斜体或取消斜体
- `Cmd/Ctrl+Enter` 切换当前 checklist 的完成状态
- `Cmd/Ctrl+Shift+7` 把当前行转换为编号列表
- `Cmd/Ctrl+Shift+8` 把当前行转换为项目符号列表

## 数据存储

Daily Sticky 使用 `electron-store` 保存数据。数据只写入当前 macOS 用户的本机应用数据目录，不会上传到任何服务器。

存储模型分为两部分：

- `notes`：按日期保存的便利贴内容
- `windows`：每个便利贴窗口的位置、尺寸和当前日期

因此，同一天的内容可以被多个窗口共享，而窗口位置仍然彼此独立。

## 项目结构

```text
src/
  main/       Electron 主进程，负责窗口、置顶、存储和 IPC
  preload/    安全暴露给渲染进程的 stickyApi
  renderer/   React 界面
  shared/     日期、窗口布局、编辑器动作等共享逻辑
tests/        Vitest 单元测试
```

## 隐私说明

这个应用没有账号系统、埋点、远程同步或第三方后端。所有便利贴内容都保存在本机。
