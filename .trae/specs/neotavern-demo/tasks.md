# Tasks

- [x] Task 1: 搭建 Tauri v2 + React + TypeScript + Vite 项目骨架
  - [x] 1.1 初始化 pnpm workspace，创建根 package.json 和 pnpm-workspace.yaml
  - [x] 1.2 创建 apps/desktop/ 目录，使用 Vite + React + TypeScript 模板初始化
  - [x] 1.3 集成 Tauri v2，配置 src-tauri/（Cargo.toml, tauri.conf.json, main.rs）
  - [x] 1.4 配置 Tailwind CSS
  - [x] 1.5 安装并配置 shadcn/ui（初始化 components.json）
  - [x] 1.6 创建 packages/core/、packages/ui/、packages/shared/ 子包结构及 package.json
  - [x] 1.7 配置 TypeScript paths 别名，确保跨包引用正常

- [x] Task 2: 定义核心 TypeScript 类型
  - [x] 2.1 在 packages/shared/types/ 定义 Character, Chat, Message, MessageRole 类型
  - [x] 2.2 在 packages/shared/types/ 定义 ModelConfig 类型
  - [x] 2.3 在 packages/shared/types/ 定义 GenerateInput, GenerateResult, GenerateMessage, GenerateChunk 类型
  - [x] 2.4 在 packages/shared/types/ 定义 BuildPromptInput, BuiltPrompt, ContextBlock, ContextInput, ContextContributor 类型
  - [x] 2.5 在 packages/core/worldbook/ 定义 WorldbookEntry, Worldbook 类型
  - [x] 2.6 在 packages/core/worldbook/ 创建 WorldbookContributor（返回空数组）
  - [x] 2.7 在 packages/core/ 创建 MemoryItem 类型和 MemoryContributor（返回空数组）

- [x] Task 3: 实现 SQLite + Drizzle ORM 数据库层
  - [x] 3.1 安装 drizzle-orm, @libsql/client（或 better-sqlite3），配置 drizzle.config.ts
  - [x] 3.2 在 apps/desktop/src/db/schema.ts 定义五张表的 Drizzle schema
  - [x] 3.3 在 apps/desktop/src/db/client.ts 创建数据库连接单例
  - [x] 3.4 执行 drizzle-kit generate 和 migrate 生成初始数据库

- [x] Task 4: 实现 Repository 层
  - [x] 4.1 实现 CharacterRepository（list, getById, create, update, delete）
  - [x] 4.2 实现 ChatRepository（list, getById, getByCharacterId, create, update, delete）
  - [x] 4.3 实现 MessageRepository（listByChatId, create, deleteByChatId）
  - [x] 4.4 实现 SettingsRepository（get, set, getAll）

- [x] Task 5: 实现 Prompt Builder 纯函数模块
  - [x] 5.1 在 packages/core/prompt/ 实现 buildChatPrompt() 纯函数
  - [x] 5.2 实现 estimateTokens() 辅助函数（简单字符数/4估算）
  - [x] 5.3 实现默认系统规则文本

- [x] Task 6: 实现 ModelProvider Adapter 层
  - [x] 6.1 在 packages/core/model-provider/ 定义 ModelProvider 接口
  - [x] 6.2 实现 OpenAICompatibleProvider 类（generate 方法）
  - [x] 6.3 预留 streamGenerate 方法（抛出未实现错误）

- [x] Task 7: 实现 Zustand 状态管理
  - [x] 7.1 创建 character.store.ts（角色列表、当前角色、CRUD 操作）
  - [x] 7.2 创建 chat.store.ts（聊天列表、当前聊天、消息列表、发送消息操作）
  - [x] 7.3 创建 settings.store.ts（模型配置、加载/保存）

- [x] Task 8: 实现共享 UI 组件
  - [x] 8.1 通过 shadcn/ui 添加 Button, Input, Textarea, Dialog, Card, Label, Select, ScrollArea 等组件
  - [x] 8.2 创建 Layout 组件（侧边栏导航 + 主内容区）
  - [x] 8.3 创建 Loading 和 Error 通用提示组件

- [x] Task 9: 实现页面组件
  - [x] 9.1 实现 HomePage（角色列表、最近聊天、新建角色入口、设置入口）
  - [x] 9.2 实现 CharacterPage（创建/编辑表单、角色列表、删除确认）
  - [x] 9.3 实现 ChatPage（角色信息侧栏、消息列表、输入框、发送按钮、Prompt Preview 可折叠面板）
  - [x] 9.4 实现 SettingsPage（模型配置表单、测试连接按钮、保存功能）

- [x] Task 10: 实现路由和 App 入口
  - [x] 10.1 安装 react-router-dom，配置 router.tsx（/, /character/:id?, /chat/:id, /settings）
  - [x] 10.2 创建 App.tsx 挂载 Router 和 Providers
  - [x] 10.3 创建 main.tsx 入口文件

- [x] Task 11: 实现 sendMessage 核心流程
  - [x] 11.1 创建 features/chat/hooks/useSendMessage.ts
  - [x] 11.2 实现完整流程：校验输入 → 保存 user message → 读取角色 → 读取最近消息 → 调用 Prompt Builder → 调用 ModelProvider.generate → 保存 assistant message → 更新 UI
  - [x] 11.3 实现 loading 状态和 error 状态处理

- [x] Task 12: 实现 Prompt Preview
  - [x] 12.1 在 ChatPage 右侧或底部添加可折叠的 Prompt Preview 面板
  - [x] 12.2 显示 previewText 内容（使用 markdown 代码块格式）
  - [x] 12.3 确保 API Key 不出现在 preview 中

- [x] Task 13: 编写文档
  - [x] 13.1 编写 docs/architecture.md（项目架构说明）
  - [x] 13.2 编写 docs/prompt-system.md（Prompt 系统设计说明）
  - [x] 13.3 编写 docs/extension-points.md（扩展点说明）

- [x] Task 14: 编写测试
  - [x] 14.1 Prompt Builder 单元测试（buildChatPrompt 纯函数测试）
  - [x] 14.2 ModelProvider mock 测试（OpenAICompatibleProvider generate 测试）

# Task Dependencies
- Task 2 依赖 Task 1（需要项目结构就绪）
- Task 3 依赖 Task 1（需要项目结构就绪）
- Task 4 依赖 Task 3（Repository 依赖 schema）
- Task 5 依赖 Task 2（Prompt Builder 依赖类型定义）
- Task 6 依赖 Task 2（ModelProvider 依赖类型定义）
- Task 7 依赖 Task 2, Task 4（Store 依赖类型和 Repository）
- Task 8 依赖 Task 1（UI 组件依赖项目配置）
- Task 9 依赖 Task 7, Task 8（页面依赖 Store 和 UI 组件）
- Task 10 依赖 Task 9（路由依赖页面）
- Task 11 依赖 Task 5, Task 6, Task 7（sendMessage 依赖 Prompt Builder, ModelProvider, Store）
- Task 12 依赖 Task 5, Task 9（Prompt Preview 依赖 Prompt Builder 和 ChatPage）
- Task 13 无强依赖，可在开发后期并行完成
- Task 14 依赖 Task 5, Task 6（测试依赖核心模块实现）

Task 2 和 Task 3 可并行执行。
Task 5 和 Task 6 可并行执行。
