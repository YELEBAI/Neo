# NeoTavern Extension Points

## Overview

NeoTavern Demo is designed with extensibility in mind. The following interfaces allow future expansion without rewriting core logic.

## 1. ModelProvider Interface

```typescript
interface ModelProvider {
  id: string
  name: string
  generate(input: GenerateInput): Promise<GenerateResult>
  streamGenerate?(input: GenerateInput): AsyncIterable<GenerateChunk>
}
```

### Current Implementation
- `OpenAICompatibleProvider` — Works with any OpenAI-compatible API

### Planned Extensions
- `ClaudeProvider` — Anthropic Claude API
- `GeminiProvider` — Google Gemini API
- `LocalLLMProvider` — Local models via Ollama/llama.cpp
- `CustomProvider` — User-defined provider

### How to Add a New Provider
1. Create a new class implementing `ModelProvider`
2. Add a case in `createModelProvider()` factory function
3. The rest of the system works unchanged

## 2. ContextContributor Interface

```typescript
interface ContextContributor {
  id: string
  name: string
  contribute(input: ContextInput): Promise<ContextBlock[]>
}
```

### Current Placeholders
- `WorldbookContributor` — Returns empty array
- `MemoryContributor` — Returns empty array

### Planned Implementations
- **WorldbookContributor**: Match user input against worldbook entry keys, inject matched entries as context
- **MemoryContributor**: Store and retrieve important conversation events, inject as context
- **PersonaContributor**: User persona/profile injection
- **SafetyContributor**: Content safety rules and filtering

### How to Add a New Contributor
1. Create a class implementing `ContextContributor`
2. Implement the `contribute()` method
3. Add the contributor instance to the contributors list in Prompt Builder

## 3. Repository Pattern

### Current Repositories
- `characterRepository` — Character CRUD
- `chatRepository` — Chat CRUD
- `messageRepository` — Message CRUD
- `settingsRepository` — Key-value settings

### Planned Extensions
- `worldbookRepository` — Worldbook entries persistence
- `memoryRepository` — Long-term memory storage
- `pluginRepository` — Plugin metadata storage

## 4. Worldbook System

### Current State
Types defined in `packages/core/worldbook/worldbook.types.ts`:
```typescript
interface WorldbookEntry {
  id: string
  title: string
  keys: string[]
  content: string
  priority: number
  enabled: boolean
  insertionPosition: 'beforeRecentMessages' | 'afterCharacter' | 'beforeUserInput'
}

interface Worldbook {
  id: string
  name: string
  entries: WorldbookEntry[]
}
```

### Future Implementation
- UI for creating/editing worldbooks
- Key matching against user input
- Automatic context injection via WorldbookContributor
- Trigger transparency in Prompt Preview

## 5. Plugin System

### Reserved Architecture
- `packages/core/plugin/` directory reserved
- Plugin interface will extend `ContextContributor` or define its own interface
- Plugins will be loaded from local directory, not remote sources (security-first)

## 6. Character Card Format Extension

### Current Format
Simple internal format with name, description, personality, scenario, firstMessage, exampleDialogues.

### Planned Extensions
- PNG character card import/export (like SillyTavern)
- JSON character card format
- Character card sharing
- Risk warnings for third-party imports
