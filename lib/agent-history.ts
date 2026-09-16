import type { AgentMessage } from './agent';

export type StoredAgentHistoryMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export function normalizeHistoryMessages(messages?: Array<{ role?: string; content?: string }>): AgentMessage[] {
  if (!Array.isArray(messages)) return [];

  const normalized: AgentMessage[] = [];

  for (const message of messages) {
    const rawRole = message?.role;
    const role: 'user' | 'assistant' | 'system' = rawRole === 'user' || rawRole === 'assistant' || rawRole === 'system'
      ? rawRole
      : 'user';
    const content = String(message?.content ?? '').trim();

    if (!content || (role !== 'user' && role !== 'assistant')) continue;
    normalized.push({ role, content });
  }

  return normalized;
}

export function buildConversationTitle(prompt?: string, fallbackTitle?: string) {
  const trimmed = String(prompt ?? '').trim();
  if (trimmed) {
    const title = trimmed.replace(/\s+/g, ' ').slice(0, 60).trim();
    return title.length > 0 ? title : fallbackTitle || 'Cuộc trò chuyện mới';
  }

  return fallbackTitle || 'Cuộc trò chuyện mới';
}
