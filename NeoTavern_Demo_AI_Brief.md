# NeoTavern Demo 开发任务书与 AI 提示词

> 你是一名资深 TypeScript、React、Tauri、LLM 应用架构师。  
> 请根据本文档，帮我从 0 搭建一个“类酒馆 / Tavern / SillyTavern”的 AI Role Play 独立客户端 Demo。  
> 目标不是一次性做完整产品，而是先做一个功能简单、能跑通核心流程、并且具备高扩展性的 Demo。

---

## 1. 项目定位

我要做一个类 SillyTavern / Tavern 的 AI Role Play 前端，但它不是网页壳，而是一个独立客户端。

项目名称暂定：

```txt
NeoTavern Demo
```

项目目标：

```txt
做一个本地独立运行的 AI RP 客户端 Demo，支持角色卡、聊天、Prompt Preview、模型配置和本地存储，并通过 Adapter / Repository / ContextContributor 三层设计保留后续扩展能力。
```

核心理念：

1. 保留酒馆类前端的优点：
   - 角色卡管理
   - 世界书扩展能力
   - 多模型连接能力
   - 高度可定制 Prompt
   - 长篇 RP / 创作友好
   - 本地优先

2. 解决传统酒馆类前端的弱点：
   - 新手配置复杂
   - 参数过多
   - Prompt 难调试
   - 世界书触发不透明
   - 多模型接口容易耦合
   - 数据存储和 UI 容易混在一起
   - 未来插件、记忆、世界书难扩展

3. Demo 阶段只做核心闭环，不做过度复杂功能。

---

## 2. 技术栈要求

请使用以下技术栈：

```txt
Tauri v2
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
Zustand
SQLite
Drizzle ORM
pnpm workspace
```

### 技术选择理由

- Tauri v2：用于构建独立桌面客户端，后续可扩展到 Windows / macOS / Linux。
- React + TypeScript：适合复杂 UI 和长期维护。
- Vite：开发体验快，适合 Demo。
- Tailwind CSS + shadcn/ui：快速搭建简洁 UI。
- Zustand：轻量状态管理。
- SQLite：本地存储角色、聊天、消息、设置。
- Drizzle ORM：类型安全地管理 SQLite schema。
- pnpm workspace：适合 monorepo，方便后续拆分 core、ui、shared。

---

## 3. Demo 必须完成的核心闭环

第一版 Demo 只需要跑通这个流程：

```txt
创建角色
  ↓
创建聊天
  ↓
输入用户消息
  ↓
Prompt Builder 拼接上下文
  ↓
调用模型 API
  ↓
显示 AI 回复
  ↓
保存聊天记录
```

核心功能包括：

```txt
1. 角色管理
   - 新建角色
   - 编辑角色
   - 删除角色
   - 角色字段：name, description, personality, scenario, firstMessage

2. 聊天管理
   - 创建聊天
   - 选择角色进入聊天
   - 展示消息列表
   - 发送用户消息
   - 展示 AI 回复

3. Prompt Builder
   - 拼接系统规则
   - 拼接角色设定
   - 拼接最近聊天记录
   - 生成最终 prompt
   - 支持查看 prompt preview

4. 模型 Provider
   - 配置 baseUrl
   - 配置 apiKey
   - 配置 model
   - 调用 OpenAI-compatible chat completions

5. 本地存储
   - 保存角色
   - 保存聊天
   - 保存消息
   - 保存模型配置
```

---

## 4. Demo 阶段暂时不要做的功能

为了保证第一版能快速完成，请不要优先做这些功能：

```txt
不要先做插件市场
不要先做多设备同步
不要先做复杂 RAG
不要先做角色卡社区
不要先做完整世界书系统
不要先做复杂群聊
不要先做云账号系统
不要先做角色卡市场
不要先做复杂权限系统
不要先做过度华丽 UI 动画
```

但需要预留以下扩展口：

```txt
世界书扩展
多模型扩展
插件扩展
长期记忆扩展
角色卡格式扩展
内容安全扩展
```

---

## 5. 架构原则

请严格遵守以下架构原则。

### 5.1 UI 不直接调用模型 API

错误做法：

```ts
// 不要在 React 组件里直接 fetch 模型 API
await fetch('/v1/chat/completions')
```

正确做法：

```txt
React Component
  ↓
useSendMessage / ChatService
  ↓
Prompt Builder
  ↓
ModelProvider.generate()
```

---

### 5.2 UI 不直接拼 Prompt

错误做法：

```ts
// 不要在 ChatPage.tsx 里拼接 prompt
const prompt = character.description + messages.join('\n')
```

正确做法：

```txt
ChatPage
  ↓
useSendMessage
  ↓
buildChatPrompt()
```

Prompt Builder 必须是独立纯逻辑模块，不依赖 React，不依赖数据库，不直接调用模型。

---

### 5.3 UI 不直接操作数据库

错误做法：

```ts
// 不要在组件里直接写 SQL
db.insert(messages).values(...)
```

正确做法：

```txt
React Component
  ↓
Hook / Service
  ↓
Repository
  ↓
Database
```

---

### 5.4 模型接口必须使用 Adapter

所有模型调用都走统一接口：

```ts
export interface ModelProvider {
  id: string
  name: string
  generate(input: GenerateInput): Promise<GenerateResult>
  streamGenerate?(input: GenerateInput): AsyncIterable<GenerateChunk>
}
```

第一版只需要实现：

```txt
OpenAICompatibleProvider
```

后续可以扩展：

```txt
LocalLLMProvider
ClaudeProvider
GeminiProvider
CustomProvider
```

---

### 5.5 上下文构建必须可扩展

不要把角色、世界书、记忆等逻辑写死在一个巨大函数里。

建议预留：

```ts
export interface ContextContributor {
  id: string
  name: string
  contribute(input: ContextInput): Promise<ContextBlock[]>
}
```

后续可以挂：

```txt
CharacterContributor
WorldbookContributor
MemoryContributor
PersonaContributor
SafetyContributor
```

---

## 6. 推荐项目结构

请生成如下 monorepo 项目结构：

```txt
neo-tavern-demo/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   ├── router.tsx
│       │   │   └── providers.tsx
│       │   │
│       │   ├── pages/
│       │   │   ├── HomePage.tsx
│       │   │   ├── CharacterPage.tsx
│       │   │   ├── ChatPage.tsx
│       │   │   └── SettingsPage.tsx
│       │   │
│       │   ├── features/
│       │   │   ├── character/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/
│       │   │   │   ├── character.store.ts
│       │   │   │   └── character.types.ts
│       │   │   │
│       │   │   ├── chat/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/
│       │   │   │   ├── chat.store.ts
│       │   │   │   └── chat.types.ts
│       │   │   │
│       │   │   ├── prompt/
│       │   │   │   ├── prompt-builder.ts
│       │   │   │   ├── prompt-preview.ts
│       │   │   │   └── prompt.types.ts
│       │   │   │
│       │   │   ├── model-provider/
│       │   │   │   ├── providers/
│       │   │   │   │   └── openai-compatible.provider.ts
│       │   │   │   ├── model-provider.interface.ts
│       │   │   │   └── model-provider.types.ts
│       │   │   │
│       │   │   └── settings/
│       │   │       ├── settings.store.ts
│       │   │       └── settings.types.ts
│       │   │
│       │   ├── shared/
│       │   │   ├── components/
│       │   │   ├── lib/
│       │   │   ├── utils/
│       │   │   └── types/
│       │   │
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   ├── client.ts
│       │   │   └── repositories/
│       │   │       ├── character.repository.ts
│       │   │       ├── chat.repository.ts
│       │   │       ├── message.repository.ts
│       │   │       └── settings.repository.ts
│       │   │
│       │   └── main.tsx
│       │
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── main.rs
│       │   │   └── commands.rs
│       │   └── tauri.conf.json
│       │
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── core/
│   │   ├── character/
│   │   ├── chat/
│   │   ├── prompt/
│   │   ├── model-provider/
│   │   ├── worldbook/
│   │   └── plugin/
│   │
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   └── dialog.tsx
│   │
│   └── shared/
│       ├── types/
│       └── utils/
│
├── docs/
│   ├── architecture.md
│   ├── prompt-system.md
│   ├── data-model.md
│   └── extension-points.md
│
├── examples/
│   ├── characters/
│   └── prompts/
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 7. 核心类型设计

请创建核心 TypeScript 类型。

### 7.1 Character

```ts
export interface Character {
  id: string
  name: string
  avatar?: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  exampleDialogues?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}
```

### 7.2 Chat

```ts
export interface Chat {
  id: string
  characterId: string
  title: string
  createdAt: string
  updatedAt: string
}
```

### 7.3 Message

```ts
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  chatId: string
  role: MessageRole
  content: string
  createdAt: string
}
```

### 7.4 ModelConfig

```ts
export interface ModelConfig {
  id: string
  provider: 'openai-compatible'
  name: string
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}
```

### 7.5 GenerateInput / GenerateResult

```ts
export interface GenerateMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateInput {
  messages: GenerateMessage[]
  model: string
  temperature?: number
  maxTokens?: number
}

export interface GenerateResult {
  content: string
  raw?: unknown
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface GenerateChunk {
  contentDelta: string
  raw?: unknown
}
```

### 7.6 Prompt 类型

```ts
export interface BuildPromptInput {
  character: Character
  recentMessages: Message[]
  userInput: string
  systemRules?: string
  userPersona?: string
  contextBlocks?: ContextBlock[]
}

export interface BuiltPrompt {
  messages: GenerateMessage[]
  previewText: string
  tokenEstimate: number
  includedContextBlocks: ContextBlock[]
}

export interface ContextBlock {
  id: string
  source: 'character' | 'worldbook' | 'memory' | 'persona' | 'system' | 'safety'
  title: string
  content: string
  priority: number
}
```

### 7.7 ContextContributor

```ts
export interface ContextInput {
  character: Character
  recentMessages: Message[]
  userInput: string
}

export interface ContextContributor {
  id: string
  name: string
  contribute(input: ContextInput): Promise<ContextBlock[]>
}
```

---

## 8. Prompt Builder 要求

请实现一个独立的 Prompt Builder。

文件建议：

```txt
packages/core/prompt/prompt-builder.ts
packages/core/prompt/prompt.types.ts
```

要求：

1. 必须是纯函数。
2. 不依赖 React。
3. 不依赖数据库。
4. 不直接调用模型 API。
5. 输出 messages、previewText、tokenEstimate、includedContextBlocks。
6. 方便后续加入世界书、RAG、长期记忆、用户 Persona。

示例逻辑：

```ts
export function buildChatPrompt(input: BuildPromptInput): BuiltPrompt {
  const messages: GenerateMessage[] = []

  const systemRules = input.systemRules ?? [
    'You are roleplaying as the selected character.',
    'Stay consistent with the character profile.',
    'Do not speak or act for the user unless explicitly requested.',
    'Keep the response coherent with the recent conversation.'
  ].join('\n')

  messages.push({
    role: 'system',
    content: systemRules
  })

  messages.push({
    role: 'system',
    content: [
      `Character Name: ${input.character.name}`,
      `Description: ${input.character.description}`,
      `Personality: ${input.character.personality}`,
      `Scenario: ${input.character.scenario}`,
      input.character.exampleDialogues
        ? `Example Dialogues:\n${input.character.exampleDialogues}`
        : ''
    ].filter(Boolean).join('\n\n')
  })

  if (input.userPersona) {
    messages.push({
      role: 'system',
      content: `User Persona:\n${input.userPersona}`
    })
  }

  const sortedContextBlocks = [...(input.contextBlocks ?? [])]
    .sort((a, b) => b.priority - a.priority)

  for (const block of sortedContextBlocks) {
    messages.push({
      role: 'system',
      content: `[${block.source}] ${block.title}\n${block.content}`
    })
  }

  for (const message of input.recentMessages) {
    messages.push({
      role: message.role,
      content: message.content
    })
  }

  messages.push({
    role: 'user',
    content: input.userInput
  })

  return {
    messages,
    previewText: messages
      .map((message) => `## ${message.role}\n${message.content}`)
      .join('\n\n---\n\n'),
    tokenEstimate: estimateTokens(messages),
    includedContextBlocks: sortedContextBlocks
  }
}

function estimateTokens(messages: GenerateMessage[]): number {
  const text = messages.map((m) => m.content).join('\n')
  return Math.ceil(text.length / 4)
}
```

---

## 9. Model Provider Adapter 要求

请实现模型适配层。

文件建议：

```txt
packages/core/model-provider/model-provider.types.ts
packages/core/model-provider/model-provider.interface.ts
packages/core/model-provider/providers/openai-compatible.provider.ts
```

接口：

```ts
export interface ModelProvider {
  id: string
  name: string
  generate(input: GenerateInput): Promise<GenerateResult>
  streamGenerate?(input: GenerateInput): AsyncIterable<GenerateChunk>
}
```

OpenAI-compatible Provider 示例：

```ts
export interface OpenAICompatibleProviderOptions {
  id: string
  name: string
  baseUrl: string
  apiKey: string
}

export class OpenAICompatibleProvider implements ModelProvider {
  id: string
  name: string
  private baseUrl: string
  private apiKey: string

  constructor(options: OpenAICompatibleProviderOptions) {
    this.id = options.id
    this.name = options.name
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.8,
        max_tokens: input.maxTokens ?? 800
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Model request failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    return {
      content,
      raw: data,
      usage: {
        promptTokens: data?.usage?.prompt_tokens,
        completionTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens
      }
    }
  }
}
```

要求：

1. 不要在 React 组件里直接 fetch。
2. 所有模型调用走 ModelProvider。
3. 第一版可以只实现 generate。
4. streamGenerate 可以先预留接口。
5. 错误信息要清晰。
6. API Key 以后需要加密存储，Demo 可以先普通保存，但字段名要预留 encryptedApiKey。

---

## 10. SQLite / Drizzle ORM 数据库要求

请使用 Drizzle ORM 设计 SQLite schema。

需要表：

```txt
characters
chats
messages
model_configs
app_settings
```

字段要求：

### characters

```txt
id
name
avatar
description
personality
scenario
first_message
example_dialogues
tags
created_at
updated_at
```

### chats

```txt
id
character_id
title
created_at
updated_at
```

### messages

```txt
id
chat_id
role
content
created_at
```

### model_configs

```txt
id
provider
name
base_url
api_key
model
temperature
max_tokens
created_at
updated_at
```

### app_settings

```txt
id
key
value
created_at
updated_at
```

Repository 要求：

```ts
export interface CharacterRepository {
  list(): Promise<Character[]>
  getById(id: string): Promise<Character | null>
  create(input: CreateCharacterInput): Promise<Character>
  update(id: string, input: UpdateCharacterInput): Promise<Character>
  delete(id: string): Promise<void>
}
```

请为以下模块创建基础 repository：

```txt
character.repository.ts
chat.repository.ts
message.repository.ts
settings.repository.ts
```

---

## 11. UI 页面要求

请实现 4 个页面。

### 11.1 HomePage

功能：

```txt
显示角色列表
显示最近聊天
点击角色可以进入聊天
可以新建角色
可以进入设置页
```

### 11.2 CharacterPage

功能：

```txt
创建角色
编辑角色
删除角色
字段包括：
- name
- description
- personality
- scenario
- firstMessage
- exampleDialogues
```

### 11.3 ChatPage

布局：

```txt
左侧：角色信息
中间：消息列表
底部：输入框和发送按钮
右侧或抽屉：Prompt Preview，可折叠
```

功能：

```txt
展示消息
发送消息
显示 AI 回复
loading 状态
错误提示
Prompt Preview
```

### 11.4 SettingsPage

功能：

```txt
配置模型 API
- provider
- name
- baseUrl
- apiKey
- model
- temperature
- maxTokens

支持测试连接
保存配置
```

---

## 12. 聊天发送流程要求

请实现 sendMessage 流程。

流程：

```txt
1. 用户输入消息
2. 校验输入不能为空
3. 保存 user message
4. 读取当前角色信息
5. 读取最近聊天消息
6. 调用 Prompt Builder
7. 生成 Prompt Preview
8. 调用 ModelProvider.generate
9. 保存 assistant message
10. 更新 UI
11. 如果失败，显示错误，但不要丢失用户输入
```

建议放在：

```txt
features/chat/hooks/useSendMessage.ts
```

或者：

```txt
packages/core/chat/chat.service.ts
```

要求：

```txt
React 组件只负责展示
业务逻辑放 hook / service
支持 loading 状态
支持 error 状态
预留 abort/cancel
代码结构可测试
```

---

## 13. 世界书扩展口

Demo 阶段不用做完整世界书 UI，但要预留接口。

建议目录：

```txt
packages/core/worldbook/
```

基础类型：

```ts
export interface WorldbookEntry {
  id: string
  title: string
  keys: string[]
  content: string
  priority: number
  enabled: boolean
  insertionPosition: 'beforeRecentMessages' | 'afterCharacter' | 'beforeUserInput'
}

export interface Worldbook {
  id: string
  name: string
  entries: WorldbookEntry[]
}
```

预留 Contributor：

```ts
export class WorldbookContributor implements ContextContributor {
  id = 'worldbook'
  name = 'Worldbook Contributor'

  async contribute(input: ContextInput): Promise<ContextBlock[]> {
    // Demo 阶段可以返回空数组
    return []
  }
}
```

后续实现：

```txt
根据用户输入和最近消息匹配 keys
把命中的 worldbook entry 转换成 ContextBlock
按 priority 排序
插入 Prompt Builder
在 Prompt Preview 里显示触发原因
```

---

## 14. 长期记忆扩展口

Demo 阶段不用做 RAG，但要预留 MemoryContributor。

```ts
export interface MemoryItem {
  id: string
  chatId: string
  content: string
  importance: number
  createdAt: string
}

export class MemoryContributor implements ContextContributor {
  id = 'memory'
  name = 'Memory Contributor'

  async contribute(input: ContextInput): Promise<ContextBlock[]> {
    return []
  }
}
```

后续可以加入：

```txt
聊天摘要
重要事件提取
角色关系记忆
向量检索
RAG
```

---

## 15. 内容安全与隐私要求

即使 Demo 阶段，也要保留基础安全设计。

要求：

```txt
1. API Key 不要打印到日志
2. Prompt Preview 可以显示内容，但不要显示 API Key
3. Settings 页面中 API Key 默认遮罩
4. 云端请求前，UI 应该明确显示当前 Provider 和 baseUrl
5. 不要内置绕过模型安全规则的提示词
6. 不要默认加载来源不明的远程插件
7. 第三方角色卡导入功能后续要做风险提示
```

系统 Prompt 应保持通用、创作友好，不要鼓励危险、违法、色情或不适龄内容。

建议默认系统规则：

```txt
You are roleplaying as the selected character.
Stay consistent with the character profile and scenario.
Do not speak or act for the user unless explicitly requested.
Keep the conversation coherent with recent messages.
Follow applicable safety rules and avoid disallowed content.
```

---

## 16. 最小 Demo UI 参考

整体布局可以参考：

```txt
┌──────────────────────────────────────────────┐
│ NeoTavern Demo                               │
├───────────────┬──────────────────────────────┤
│ Characters    │ Chat                         │
│               │                              │
│ - Alice       │ Alice                         │
│ - Knight      │                              │
│ - Assistant   │ User: hello                  │
│               │ AI: hi, welcome back...      │
│ + New         │                              │
│               │ [ input message...       ]   │
├───────────────┴──────────────────────────────┤
│ Prompt Preview | Model Settings | Debug      │
└──────────────────────────────────────────────┘
```

UI 风格：

```txt
简洁
暗色 / 亮色都可
不要复杂动画
优先功能清晰
Prompt Preview 要容易看到
错误提示要清楚
```

---

## 17. 开发顺序

请按以下顺序实现：

```txt
第 1 步：搭建 Tauri + React + TypeScript + Vite 项目
第 2 步：配置 pnpm workspace
第 3 步：配置 Tailwind CSS 和基础 UI
第 4 步：创建 monorepo 目录结构
第 5 步：定义核心 TypeScript types
第 6 步：实现静态 UI 页面
第 7 步：实现 SQLite / Drizzle schema
第 8 步：实现 Repository 层
第 9 步：实现角色 CRUD
第 10 步：实现聊天和消息 CRUD
第 11 步：实现 Prompt Builder
第 12 步：实现 OpenAI-compatible ModelProvider
第 13 步：实现 Settings 页面和模型配置保存
第 14 步：实现 sendMessage 流程
第 15 步：实现 Prompt Preview
第 16 步：预留 WorldbookContributor 和 MemoryContributor
第 17 步：补充 docs/architecture.md、docs/prompt-system.md、docs/extension-points.md
```

---

## 18. 输出要求

请你输出完整可运行项目代码。

至少包括：

```txt
1. package.json
2. pnpm-workspace.yaml
3. apps/desktop/package.json
4. Vite 配置
5. Tauri 基础配置
6. React 入口
7. Router
8. 4 个页面
9. 核心 types
10. Prompt Builder
11. ModelProvider interface
12. OpenAICompatibleProvider
13. SQLite / Drizzle schema
14. Repository 示例
15. useSendMessage
16. Zustand store
17. README.md
18. docs/architecture.md
19. docs/prompt-system.md
20. docs/extension-points.md
```

如果一次无法输出所有代码，请按模块分批输出，但每一批都要保证能接上前一批。

---

## 19. 质量要求

代码质量要求：

```txt
TypeScript 类型清晰
不要使用 any，除非确实必要
核心逻辑要可测试
UI 和业务逻辑分离
模型调用和 UI 分离
数据库访问和 UI 分离
Prompt Builder 是纯函数
错误处理清楚
目录结构清楚
命名一致
```

最小测试要求：

```txt
Prompt Builder 单元测试
ModelProvider mock 测试
Repository 基础测试，可选
sendMessage 流程测试，可选
```

---

## 20. 验收标准

Demo 完成后应该可以做到：

```txt
1. 启动桌面客户端
2. 创建一个角色
3. 配置 OpenAI-compatible API
4. 创建一次聊天
5. 输入一句用户消息
6. 查看 Prompt Preview
7. 成功收到 AI 回复
8. 聊天记录被保存
9. 关闭重开后聊天记录仍存在
10. 后续可以通过新增 Provider 支持其他模型
11. 后续可以通过 ContextContributor 接入世界书或长期记忆
```

---

## 21. 给 AI 的最终执行指令

请严格按照本文档实现项目。

优先保证：

```txt
核心聊天闭环跑通
架构清晰
扩展口正确
不要过度设计
不要把 UI、数据库、模型 API、Prompt 拼接混在一起
```

第一版不追求功能多，追求：

```txt
能跑
好扩展
好调试
结构干净
```

请先输出项目结构和第一批核心文件，然后继续实现核心功能。
