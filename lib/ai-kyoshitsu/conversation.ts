/**
 * lib/ai-kyoshitsu/conversation.ts
 * うごくAI教室 — チャット会話履歴の型 & zod スキーマ
 *
 * 用途:
 *   - app/(site)/tools/ai-kyoshitsu/page.tsx
 *       ChatMessage[] (UI 内部表現) → ConversationTurn[] (API 送信用) に変換
 *   - app/api/generate-animation/route.ts
 *       Stage 1 への user message に「過去の対話履歴」セクションを差し込む
 *
 * 設計:
 *   - 軽量化のため variant や id は持たず、role + text のみに簡素化
 *   - thinking バブルは履歴に含めない（フロント側で除外）
 *   - 直近 N ターンに制限（履歴肥大による Stage 1 トークン浪費を防ぐ）
 */

import { z } from 'zod';

/** 1 メッセージあたりの最大文字数（テーマ入力上限と同じ・~2KB） */
export const MAX_TURN_TEXT_LENGTH = 2000;

/** 直近 N ターンに制限（user 4 + ai 4 = 8 ターン） */
export const MAX_CONVERSATION_TURNS = 8;

/** 1 ターン分（ユーザー or AI 発言） */
export const conversationTurnSchema = z.object({
  role: z.enum(['user', 'ai']),
  text: z.string().min(1).max(MAX_TURN_TEXT_LENGTH),
});

/** 会話履歴全体（API リクエストで受け取る配列） */
export const conversationHistorySchema = z
  .array(conversationTurnSchema)
  .max(MAX_CONVERSATION_TURNS * 2); // バリデーションは余裕を持って 2 倍まで許容

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
