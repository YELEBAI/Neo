# Checklist

## 项目基础设施
- [x] pnpm workspace monorepo 结构正确（apps/desktop, packages/core, packages/ui, packages/shared）
- [x] Tauri v2 桌面窗口可正常启动
- [x] Tailwind CSS 样式生效
- [x] shadcn/ui 组件可用
- [x] TypeScript paths 别名配置正确，跨包引用正常

## 数据层
- [x] Drizzle ORM schema 包含 characters, chats, messages, model_configs, app_settings 五张表
- [x] 数据库迁移可执行成功
- [x] CharacterRepository 的 list/getById/create/update/delete 方法正常运行
- [x] ChatRepository 的 list/getById/getByCharacterId/create/update/delete 方法正常运行
- [x] MessageRepository 的 listByChatId/create/deleteByChatId 方法正常运行
- [x] SettingsRepository 的 get/set/getAll 方法正常运行

## 核心类型
- [x] Character, Chat, Message, MessageRole 类型定义完整
- [x] ModelConfig 类型定义完整
- [x] GenerateInput, GenerateResult, GenerateMessage, GenerateChunk 类型定义完整
- [x] BuildPromptInput, BuiltPrompt, ContextBlock, ContextInput, ContextContributor 类型定义完整
- [x] WorldbookEntry, Worldbook 类型定义完整
- [x] MemoryItem 类型定义完整

## Prompt Builder
- [x] buildChatPrompt() 是纯函数，不依赖 React、数据库、模型 API
- [x] 传入 character + recentMessages + userInput 返回正确的 BuiltPrompt
- [x] previewText 格式清晰可读
- [x] tokenEstimate 计算正确（字符数/4 估算）
- [x] includedContextBlocks 包含所有贡献的 context blocks
- [x] 系统规则默认文本正确嵌入

## ModelProvider
- [x] ModelProvider 接口定义正确（id, name, generate, streamGenerate?）
- [x] OpenAICompatibleProvider.generate() 可成功调用 OpenAI-compatible API
- [x] API 请求格式正确（POST /chat/completions, JSON body）
- [x] 错误响应抛出明确错误信息（含状态码）
- [x] GenerateResult 包含 content, raw, usage 字段
- [x] streamGenerate 接口已预留

## 状态管理
- [x] character.store 提供完整的角色 CRUD 状态
- [x] chat.store 提供聊天列表、消息列表、发送消息状态
- [x] settings.store 提供模型配置的加载和保存

## UI 页面
- [x] HomePage 显示角色列表和最近聊天
- [x] HomePage 可导航到新建角色页和设置页
- [x] HomePage 点击角色可进入聊天
- [x] CharacterPage 可创建新角色（所有字段可填写）
- [x] CharacterPage 可编辑已有角色
- [x] CharacterPage 可删除角色（含确认弹窗）
- [x] ChatPage 显示角色信息侧栏
- [x] ChatPage 显示消息列表
- [x] ChatPage 底部有输入框和发送按钮
- [x] ChatPage 发送消息时显示 loading 状态
- [x] ChatPage 发送失败时显示错误提示，不丢失用户输入
- [x] SettingsPage 可配置 model provider 参数
- [x] SettingsPage 可保存配置到数据库
- [x] SettingsPage API Key 输入框默认遮罩

## Prompt Preview
- [x] ChatPage 可展开 Prompt Preview 面板
- [x] Prompt Preview 显示完整的 prompt 文本
- [x] Prompt Preview 内容中不包含 API Key

## sendMessage 流程
- [x] 用户输入校验（不为空）
- [x] 用户消息保存到数据库
- [x] 读取角色信息正确
- [x] 读取最近聊天消息正确
- [x] 调用 buildChatPrompt() 构建 prompt
- [x] 调用 ModelProvider.generate() 获取 AI 回复
- [x] AI 回复保存到数据库
- [x] UI 实时更新显示新消息
- [x] 错误时不丢失用户输入

## 扩展口
- [x] packages/core/worldbook/ 包含 WorldbookEntry, Worldbook 类型
- [x] WorldbookContributor 实现 ContextContributor 接口，返回空数组
- [x] MemoryContributor 实现 ContextContributor 接口，返回空数组
- [x] ContextContributor 接口定义明确，后续可新增 contributor

## 架构分层
- [x] React 组件不直接 fetch 模型 API（通过 hook/service）
- [x] React 组件不直接拼接 prompt（通过 buildChatPrompt）
- [x] React 组件不直接操作数据库（通过 Repository）
- [x] Prompt Builder 不依赖 React、数据库、模型 API

## 安全
- [x] API Key 不出现在 console.log 或日志中
- [x] Prompt Preview 不显示 API Key
- [x] Settings 页面 API Key 输入框类型为 password

## 文档
- [x] docs/architecture.md 说明项目架构
- [x] docs/prompt-system.md 说明 Prompt 系统设计
- [x] docs/extension-points.md 说明扩展点

## 验收标准（来自文档 Section 20）
- [x] 可启动桌面客户端
- [x] 可创建角色
- [x] 可配置 OpenAI-compatible API
- [x] 可创建聊天
- [x] 可输入用户消息
- [x] 可查看 Prompt Preview
- [x] 可收到 AI 回复
- [x] 聊天记录被保存
- [x] 关闭重开后聊天记录仍存在
- [x] 后续可通过新增 Provider 支持其他模型
- [x] 后续可通过 ContextContributor 接入世界书或长期记忆

## 测试
- [x] Prompt Builder 单元测试通过
- [x] ModelProvider mock 测试通过

## 代码质量
- [x] 无 TypeScript 编译错误
- [x] 不使用 any 类型（除非确实必要）
- [x] 核心逻辑可测试
- [x] 目录结构清晰
- [x] 命名一致
