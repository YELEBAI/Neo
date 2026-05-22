# NeoTavern Demo Architecture

## Overview

NeoTavern Demo is a local-first AI Role Play desktop client built with Tauri v2, React, and TypeScript. It follows a layered architecture with strict separation of concerns.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│              React UI Layer              │
│  Pages → Components → Hooks             │
├─────────────────────────────────────────┤
│           State Management              │
│         Zustand Stores                  │
├─────────────────────────────────────────┤
│           Business Logic                │
│  Prompt Builder | ModelProvider         │
├─────────────────────────────────────────┤
│           Data Access Layer             │
│         Repositories                    │
├─────────────────────────────────────────┤
│           Persistence                   │
│     SQLite + Drizzle ORM               │
└─────────────────────────────────────────┘
```

### UI Layer (apps/desktop/src/pages/, shared/components/)
- React components handle only presentation and user interaction
- No direct API calls, no direct database access, no prompt composition
- Uses hooks for business logic delegation

### State Management (apps/desktop/src/features/*/store.ts)
- Zustand stores manage application state
- character.store: Character CRUD state
- chat.store: Chat and message state, send message operations
- settings.store: Model configuration state

### Business Logic (packages/core/)
- **Prompt Builder**: Pure function that composes system rules, character profiles, conversation history, and user input into model-ready messages
- **ModelProvider**: Adapter interface for AI model APIs (currently OpenAI-compatible)
- **ContextContributor**: Extensible interface for injecting context (worldbook, memory, etc.)

### Data Access (apps/desktop/src/db/repositories/)
- Repository pattern wraps all database operations
- Each repository provides typed CRUD methods
- Never accessed directly from UI components

### Persistence (apps/desktop/src/db/)
- SQLite via libsql client
- Drizzle ORM for type-safe schema and queries
- Five tables: characters, chats, messages, model_configs, app_settings

## Design Principles

1. **UI never calls model APIs directly** — always through ModelProvider interface
2. **UI never composes prompts directly** — always through Prompt Builder
3. **UI never accesses database directly** — always through Repositories
4. **Prompt Builder is a pure function** — no React, no database, no API dependencies
5. **Extensible by design** — ContextContributor and ModelProvider interfaces allow future expansion

## Project Structure

```
neo-tavern-demo/
├── apps/desktop/          # Tauri v2 desktop application
│   ├── src/
│   │   ├── app/           # App entry, router, providers
│   │   ├── pages/         # Page components
│   │   ├── features/      # Feature modules (stores, hooks)
│   │   ├── shared/        # Shared components
│   │   └── db/            # Database schema, client, repositories
│   └── src-tauri/         # Rust backend
├── packages/
│   ├── core/              # Business logic (prompt, model-provider, worldbook, memory)
│   ├── ui/                # Reusable UI components
│   └── shared/            # Shared types and utilities
└── docs/                  # Documentation
```

## Data Flow (Send Message)

```
User types message
  ↓
ChatPage dispatches via useSendMessage hook
  ↓
1. Validate input
2. Save user message via MessageRepository
3. Read character from CharacterRepository
4. Read recent messages from MessageRepository
5. buildChatPrompt() composes system + character + history + input
6. createModelProvider() creates appropriate adapter
7. provider.generate() calls model API
8. Save assistant message via MessageRepository
9. Zustand store updates trigger UI re-render
```
