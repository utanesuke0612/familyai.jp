/**
 * test/unit/mappers.test.ts
 * familyai.jp — DB 行 → API DTO 変換マッパーの契約検証
 *
 * R1-T4（Rev30 候補）: shared/types 契約と mappers の整合を保証する。
 * 対象:
 *   - lib/mappers/ai-memos.ts        : toAiMemoItem
 *   - lib/mappers/vocab-bookmarks.ts : toVocabItem
 *
 * Rev36: lib/mappers/animations.ts は 3D 図鑑リプレイスに伴い削除済み。
 */

import { describe, it, expect } from 'vitest';
import { toAiMemoItem, type AiMemoRow } from '@/lib/mappers/ai-memos';
import { toVocabItem, type VocabBookmarkRow } from '@/lib/mappers/vocab-bookmarks';

// ─── AI Memo ────────────────────────────────────────────────────
describe('toAiMemoItem', () => {
  const baseRow: AiMemoRow = {
    memoId:       'memo-1',
    answer:       '光合成は…',
    question:     '光合成って何？',
    articleTitle: '理科の入門',
    articleSlug:  'rika-intro',
    savedAt:      1714291200000,
  };

  it('articleSlug がある場合: 値が保持される', () => {
    expect(toAiMemoItem(baseRow)).toEqual({
      id:           'memo-1',
      answer:       '光合成は…',
      question:     '光合成って何？',
      articleTitle: '理科の入門',
      articleSlug:  'rika-intro',
      savedAt:      1714291200000,
    });
  });

  it('articleSlug が null の場合: undefined に変換される', () => {
    const item = toAiMemoItem({ ...baseRow, articleSlug: null });
    expect(item.articleSlug).toBeUndefined();
    // 他のフィールドは保たれる
    expect(item.id).toBe('memo-1');
    expect(item.answer).toBe('光合成は…');
  });

  it('memoId → id の名前変換が行われる', () => {
    const item = toAiMemoItem(baseRow);
    expect(item).not.toHaveProperty('memoId');
    expect(item.id).toBe('memo-1');
  });
});

// ─── Vocab Bookmark ─────────────────────────────────────────────
describe('toVocabItem', () => {
  const fullRow: VocabBookmarkRow = {
    vocabId:     'voa-12-impact',
    word:        'impact',
    meaning:     '影響',
    pron:        '/ˈɪmpækt/',
    example:     'It had a big impact.',
    course:      'voa-learning-english',
    lesson:      'lesson-12',
    lessonTitle: 'Climate Change',
    addedAt:     1714291200000,
  };

  it('全フィールドあり: 値が保持される', () => {
    expect(toVocabItem(fullRow)).toEqual({
      id:          'voa-12-impact',
      word:        'impact',
      meaning:     '影響',
      pron:        '/ˈɪmpækt/',
      example:     'It had a big impact.',
      course:      'voa-learning-english',
      lesson:      'lesson-12',
      lessonTitle: 'Climate Change',
      addedAt:     1714291200000,
    });
  });

  it('optional フィールドが null の場合: undefined に変換される', () => {
    const minimalRow: VocabBookmarkRow = {
      vocabId:     'word-1',
      word:        'hello',
      meaning:     'やあ',
      pron:        null,
      example:     null,
      course:      null,
      lesson:      null,
      lessonTitle: null,
      addedAt:     1714291200000,
    };
    const item = toVocabItem(minimalRow);
    expect(item.pron).toBeUndefined();
    expect(item.example).toBeUndefined();
    expect(item.course).toBeUndefined();
    expect(item.lesson).toBeUndefined();
    expect(item.lessonTitle).toBeUndefined();
    // 必須フィールドは保たれる
    expect(item.id).toBe('word-1');
    expect(item.word).toBe('hello');
    expect(item.meaning).toBe('やあ');
    expect(item.addedAt).toBe(1714291200000);
  });

  it('vocabId → id の名前変換が行われる', () => {
    const item = toVocabItem(fullRow);
    expect(item).not.toHaveProperty('vocabId');
    expect(item.id).toBe('voa-12-impact');
  });
});
