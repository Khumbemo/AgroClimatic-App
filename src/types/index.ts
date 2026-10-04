// Domain records live in src/data/schema.ts. Only UI-only types remain here.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
