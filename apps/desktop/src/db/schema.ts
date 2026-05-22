import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  description: text('description').notNull().default(''),
  personality: text('personality').notNull().default(''),
  scenario: text('scenario').notNull().default(''),
  firstMessage: text('first_message').notNull().default(''),
  exampleDialogues: text('example_dialogues'),
  tags: text('tags'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
})

export const modelConfigs = sqliteTable('model_configs', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull().default('openai-compatible'),
  name: text('name').notNull().default(''),
  baseUrl: text('base_url').notNull().default(''),
  apiKey: text('api_key').notNull().default(''),
  model: text('model').notNull().default(''),
  temperature: real('temperature').notNull().default(0.8),
  maxTokens: integer('max_tokens').notNull().default(800),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
