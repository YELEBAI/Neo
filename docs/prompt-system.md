# NeoTavern Prompt System

## Overview

The Prompt Builder is the core of NeoTavern's context assembly. It is a pure function that takes structured input and produces model-ready messages array.

## Architecture

The Prompt Builder is located in `packages/core/prompt/prompt-builder.ts` and has zero dependencies on React, database, or model APIs.

## Input: BuildPromptInput

```typescript
interface BuildPromptInput {
  character: Character          // The roleplay character
  recentMessages: Message[]     // Recent conversation history
  userInput: string             // Current user message
  systemRules?: string          // Custom system rules (optional)
  userPersona?: string          // User persona description (optional)
  contextBlocks?: ContextBlock[] // Additional context from contributors
}
```

## Output: BuiltPrompt

```typescript
interface BuiltPrompt {
  messages: GenerateMessage[]   // Final messages array for model API
  previewText: string           // Human-readable prompt preview
  tokenEstimate: number         // Rough token count estimate
  includedContextBlocks: ContextBlock[] // Context blocks included
}
```

## Message Assembly Order

1. **System Rules** — Default or custom roleplay instructions
2. **Character Profile** — Name, description, personality, scenario, example dialogues
3. **User Persona** — Optional user character description
4. **Context Blocks** — From ContextContributors, sorted by priority
5. **Recent Messages** — Conversation history (last N messages)
6. **User Input** — Current message from user

## Default System Rules

```
You are roleplaying as the selected character.
Stay consistent with the character profile and scenario.
Do not speak or act for the user unless explicitly requested.
Keep the conversation coherent with recent messages.
Follow applicable safety rules and avoid disallowed content.
```

## Extension Points

### ContextContributor Interface

```typescript
interface ContextContributor {
  id: string
  name: string
  contribute(input: ContextInput): Promise<ContextBlock[]>
}
```

Contributors can inject additional context blocks into the prompt. Current placeholders:
- **WorldbookContributor** — Future world/lore book integration
- **MemoryContributor** — Future long-term memory integration

### Custom System Rules

Users can provide custom `systemRules` via the `BuildPromptInput.systemRules` field, overriding the default rules.

## Token Estimation

A simple character-based estimation: `ceil(totalCharacters / 4)`. This is approximate and should be replaced with a proper tokenizer for production use.
