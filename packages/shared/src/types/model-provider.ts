export interface GenerateMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateInput {
  messages: GenerateMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
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

export interface ModelProvider {
  id: string
  name: string
  generate(input: GenerateInput): Promise<GenerateResult>
  streamGenerate?(input: GenerateInput): AsyncIterable<GenerateChunk>
}
