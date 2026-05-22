# NeoTavern

> 下一代角色扮演 AI 聊天客户端 — 基于 Tauri + React + TypeScript

---

## 截图

```
╔══════════════════════════════════════════════╗
║  Nav: Home | Characters | Presets | Settings ║
╠══════════════════════════════════════════════╣
║  Left Panel         ║  Chat Area             ║
║  Character info     ║  ┌──────────────────┐  ║
║  Personality        ║  │ AI: Roleplay...  │  ║
║  Scenario           ║  └──────────────────┘  ║
║                     ║  > Summary ▸           ║
║                     ║  > 内心 ▸              ║
║                     ║                        ║
║                     ║  [Input box] [Send] [⏹]║
║                     ║  [Prompt Preview ▾]    ║
╚══════════════════════════════════════════════╝
```

## 功能亮点

### 🎭 角色管理
- 创建 / 编辑 / 删除角色卡片
- 支持角色名、描述、性格、场景、开场白、示例对话、标签
- 选择角色即可开始新对话

### 💬 对话系统
- 实时聊天界面，双方头像显示
- **停止生成**：AI 输出中途可中断
- 每条 AI 消息可 **复制 / 编辑 / 查看完整提示词 / 重新生成**
- Prompt Preview 实时预览完整提示词拼装
- **上下文 Token 滑块**（Settings → Context），用 token 预算控制历史消息数量

### 📦 预设管理系统
- 创建多个预设，每个预设包含多张**卡片**
- 每张卡片：名称、开关（滑块）、角色（system/user）、内容、排序号
- 一键激活预设，激活后卡片自动注入对话 Prompt
- **导入/导出 JSON**：兼容酒馆（SillyTavern）预设格式
- 导入时自动提取预设名（从 `extensions.presetdetailnfo.nameGroup`）

### 🔧 正则系统（附内容提取）
- 正则预设管理（Settings → Regex Rules），结构类似提示词预设
- 每条正则规则可配置：名称、正则模式、显示模板、**启用/禁用开关**、**Strip from Prompt 开关**
- AI 输出自动按正则拆分：正文 + 附属折叠块（摘要、思考等）
- 附属内容不会进入下一轮 Prompt（仅正文参与）
- 导入酒馆预设时自动提取 `regex_scripts` 中的正则规则

### ⚙️ API 配置
- 兼容 OpenAI 及所有 OpenAI-compatible 端点（Ollama、vLLM 等）
- 多个 API 配置并存，随时切换
- 连接测试功能

### 🎨 外观
- Light / Dark / System 三种主题
- 即时切换，无需重启

### 🖥️ 跨平台桌面应用
- 基于 **Tauri** 构建原生桌面应用
- Windows / macOS / Linux 支持

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Tauri v2 (Rust) |
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand |
| 数据库 | localStorage |
| 包管理 | pnpm workspace monorepo |
| UI 组件 | Radix UI + Tailwind CSS |
| 图标 | Lucide Icons |

## 项目结构

```
Neo/
├── apps/
│   └── desktop/            # Tauri 桌面应用
│       ├── src/
│       │   ├── app/        # 路由、主题、启动
│       │   ├── db/         # localStorage 仓储层
│       │   ├── features/   # 按功能模块（chat/character/settings/preset）
│       │   ├── pages/      # 页面组件
│       │   └── shared/     # 共享组件
│       └── src-tauri/      # Tauri Rust 后端
├── packages/
│   ├── shared/             # 共享类型定义
│   ├── core/               # 核心业务逻辑（Prompt Builder、模型调用、正则引擎）
│   └── ui/                 # UI 组件库（Button、Card、Dialog 等）
├── 预设/                   # 预设导入示例
├── start.bat               # Windows 一键启动
├── launch.bat              # 菜单式启动（含 Rust 自动安装）
└── package.json            # Workspace 根配置
```

## 快速开始

### 前提条件
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://rustup.rs/)（Tauri 桌面应用需要）

### 安装

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/Neo.git
cd Neo

# 安装依赖
pnpm install
```

### 运行

**方式一：Web 开发模式（浏览器）**
```bash
pnpm dev
# 打开 http://localhost:1420
```

**方式二：Tauri 桌面应用**
```bash
pnpm tauri dev
```

**方式三：Windows 一键启动**
双击 `start.bat` 或 `launch.bat`

### 构建

```bash
pnpm build
```

### 运行测试

```bash
pnpm --filter @neo-tavern/desktop test
```

## 预设导入

1. 打开应用 → 左侧导航进入 **Presets**
2. 点击左下角 **Import** 按钮
3. 选择 `.json` 预设文件（兼容酒馆格式）
4. 导入后预设卡片和正则规则自动配好

示例预设文件在 `预设/` 目录。

## 正则规则配置

1. Settings → Regex Rules
2. 创建正则预设 → 添加规则
3. 规则配置：
   - **Name**：规则名称
   - **Enabled**：开关
   - **Strip**：是否从 Prompt 中移除匹配内容
   - **Pattern**：JS 正则表达式
   - **Display**：显示模板（`$1`, `$2` 引用捕获组）
4. 点 **Activate** 激活预设
5. 聊天中 AI 输出自动按规则拆分

常用规则示例：
| 名称 | Pattern | Strip |
|------|---------|-------|
| Summary | `<summary>([\s\S]*?)<\/summary>` | ✅ |
| 思考 | `<(thought\|os)>\s?([\s\S]*?)\s?<\/[\S\s]*?>` | ✅ |
| JSON代码块 | `` ```json([\s\S]*?)``` `` | ✅ |

## License

MIT

---

*Built with ♥ by the NeoTavern team*
