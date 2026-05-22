# NeoTavern Demo Spec

## Why
构建一个本地独立运行的 AI Role Play 桌面客户端 Demo（类 SillyTavern/Tavern），跑通"创建角色→聊天→Prompt 拼接→调用模型→AI 回复→保存记录"核心闭环，并通过 Adapter / Repository / ContextContributor 三层设计保留后续扩展能力。

## What Changes
- 从零搭建 Tauri v2 + React + TypeScript + Vite monorepo 项目
- 实现角色管理 CRUD（创建/编辑/删除/列表）
- 实现聊天管理（创建聊天、消息列表、发送/接收消息）
- 实现独立 Prompt Builder 纯函数模块
- 实现 OpenAI-compatible ModelProvider Adapter
- 实现 SQLite + Drizzle ORM 数据持久化（characters, chats, messages, model_configs, app_settings）
- 实现 Settings 页面（模型 API 配置）
- 实现 Prompt Preview 功能
- 预留 WorldbookContributor 和 MemoryContributor 扩展口
- 编写 docs/architecture.md、docs/prompt-system.md、docs/extension-points.md

## Impact
- Affected specs: 全新项目，无现有 specs 受影响
- Affected code: 全新项目，无现有代码受影响
- 项目路径: `d:\ai_make_project\Neo\`

## ADDED Requirements

### Requirement: 项目基础设施搭建
系统 SHALL 使用 pnpm workspace monorepo 结构，包含 Tauri v2 桌面应用。

#### Scenario: 项目初始化成功
- **WHEN** 执行 `pnpm install` 并启动开发服务器
- **THEN** Tauri 桌面窗口应成功打开并显示 React 应用

#### Scenario: monorepo 结构就绪
- **WHEN** 查看项目目录
- **THEN** 应包含 `apps/desktop/`、`packages/core/`、`packages/ui/`、`packages/shared/` 目录结构

---

### Requirement: 角色管理
系统 SHALL 提供角色的创建、编辑、删除和列表功能，角色字段包括 name, description, personality, scenario, firstMessage, exampleDialogues, tags, avatar。

#### Scenario: 创建角色
- **WHEN** 用户在角色页面填写角色信息并提交
- **THEN** 新角色被保存到 SQLite 数据库，并出现在角色列表中

#### Scenario: 编辑角色
- **WHEN** 用户选择已有角色并修改其字段
- **THEN** 角色信息被更新并持久化

#### Scenario: 删除角色
- **WHEN** 用户确认删除一个角色
- **THEN** 该角色及其关联数据从数据库中移除

---

### Requirement: 聊天管理
系统 SHALL 支持创建聊天、选择角色、展示消息列表和发送消息。

#### Scenario: 创建聊天
- **WHEN** 用户选择一个角色并开始新对话
- **THEN** 创建一个新 Chat 记录并关联该角色

#### Scenario: 发送用户消息
- **WHEN** 用户在聊天输入框输入消息并发送
- **THEN** 用户消息被保存，Prompt Builder 构建上下文，调用模型 API，AI 回复被显示并保存

#### Scenario: 查看历史消息
- **WHEN** 用户进入已有聊天
- **THEN** 显示该聊天的完整消息历史

---

### Requirement: Prompt Builder
系统 SHALL 提供独立的 Prompt Builder 纯函数模块，不依赖 React、数据库或模型 API。

#### Scenario: 构建聊天 Prompt
- **WHEN** 调用 `buildChatPrompt()` 并传入 character、recentMessages、userInput
- **THEN** 返回包含 messages 数组、previewText、tokenEstimate、includedContextBlocks 的 BuiltPrompt 对象

#### Scenario: Prompt Preview 查看
- **WHEN** 用户在聊天页面展开 Prompt Preview
- **THEN** 显示当前请求将发送给模型的完整 prompt 文本

---

### Requirement: Model Provider Adapter
系统 SHALL 通过统一的 ModelProvider 接口调用模型 API，UI 层不直接 fetch。

#### Scenario: 调用 OpenAI-compatible API
- **WHEN** 配置了有效的 baseUrl、apiKey、model 参数并调用 `ModelProvider.generate()`
- **THEN** 返回包含 AI 回复内容和 token 使用信息的 GenerateResult

#### Scenario: API 调用失败处理
- **WHEN** API 返回错误状态码
- **THEN** 抛出包含状态码和错误信息的明确错误

---

### Requirement: 模型配置管理
系统 SHALL 在 Settings 页面提供模型 API 配置功能。

#### Scenario: 保存模型配置
- **WHEN** 用户填写 provider、baseUrl、apiKey、model、temperature、maxTokens 并保存
- **THEN** 配置被持久化到数据库

#### Scenario: API Key 安全遮罩
- **WHEN** 用户在 Settings 页面查看已保存的 API Key
- **THEN** API Key 默认以遮罩形式显示

---

### Requirement: 数据持久化
系统 SHALL 使用 SQLite + Drizzle ORM 实现本地数据存储，包含 characters、chats、messages、model_configs、app_settings 五张表。

#### Scenario: 数据跨会话持久化
- **WHEN** 用户关闭应用后重新打开
- **THEN** 之前创建的角色、聊天、消息和配置仍然存在

---

### Requirement: 扩展口预留
系统 SHALL 预留 ContextContributor 接口和 Worldbook/Memory 类型定义。

#### Scenario: WorldbookContributor 存在但返回空
- **WHEN** Prompt Builder 接收 contextBlocks 参数
- **THEN** WorldbookContributor 存在但 demo 阶段返回空数组，不影响核心流程

#### Scenario: MemoryContributor 存在但返回空
- **WHEN** Prompt Builder 接收 contextBlocks 参数
- **THEN** MemoryContributor 存在但 demo 阶段返回空数组，不影响核心流程

---

### Requirement: 架构分层约束
系统 SHALL 严格遵循分层架构：UI 不直接调用模型 API、UI 不直接拼接 Prompt、UI 不直接操作数据库。

#### Scenario: UI 通过 Service/Hook 调用模型
- **WHEN** React 组件需要调用模型
- **THEN** 必须通过 useSendMessage hook 或 ChatService，不直接在组件中 fetch

#### Scenario: Prompt 构建与 UI 解耦
- **WHEN** 需要构建 prompt
- **THEN** 调用纯函数 buildChatPrompt()，不包含任何 React 依赖

#### Scenario: 数据库访问通过 Repository
- **WHEN** 需要读写数据
- **THEN** 必须通过 Repository 层，不直接在组件中操作数据库

---

### Requirement: 安全与隐私
系统 SHALL 遵循基本安全规范：API Key 不打印到日志、不显示在 Prompt Preview、默认遮罩。

#### Scenario: API Key 不出现在日志
- **WHEN** 系统运行过程中
- **THEN** 日志中不包含 API Key 明文

#### Scenario: API Key 不在 Prompt Preview 中显示
- **WHEN** 用户查看 Prompt Preview
- **THEN** preview 内容中不包含 API Key
