/**
 * test/unit/mappers.test.ts
 * familyai.jp — DB 行 → API DTO 変換マッパーの契約検証
 *
 * R1-T4（Rev30 候補）: shared/types 契約と mappers の整合を保証する。
 * 対象:
 *   - lib/mappers/animations.ts      : toAnimationSummary / toAnimationDetail
 *   - lib/mappers/ai-memos.ts        : toAiMemoItem
 *   - lib/mappers/vocab-bookmarks.ts : toVocabItem
 */

import { describe, it, expect } from 'vitest';
import {
  toAnimationSummary,
  toAnimationDetail,
  type AnimationRow,
} from '@/lib/mappers/animations';
import { toAiMemoItem, type AiMemoRow } from '@/lib/mappers/ai-memos';
import { toVocabItem, type VocabBookmarkRow } from '@/lib/mappers/vocab-bookmarks';

// ─── Animations ─────────────────────────────────────────────────
describe('toAnimationSummary / toAnimationDetail', () => {
  const row: AnimationRow = {
    id:          'anim-1',
    userId:      'u1',
    theme:       '磁石の力',
    grade:       'elem-low',
    subject:     'science',
    prompt:      '磁石',
    htmlContent: '<!DOCTYPE html><html></html>',
    createdAt:   new Date('2026-04-28T10:00:00Z'),
  };

  it('Summary: htmlContent / userId が含まれない', () => {
    const s = toAnimationSummary(row);
    expect(s).toEqual({
      id:        'anim-1',
      theme:     '磁石の力',
      grade:     'elem-low',
      subject:   'science',
      prompt:    '磁石',
      createdAt: '2026-04-28T10:00:00.000Z',
    });
    // private 列は外に出ないこと
    expect(s).not.toHaveProperty('htmlContent');
    expect(s).not.toHaveProperty('userId');
  });

  it('Detail: htmlContent / userId が含まれる', () => {
    const d = toAnimationDetail(row);
    expect(d.htmlContent).toBe('<!DOCTYPE html><html></html>');
    expect(d.userId).toBe('u1');
    expect(d.id).toBe('anim-1');
  });

  it('createdAt が string でも ISO に正規化される', () => {
    const s = toAnimationSummary({ ...row, createdAt: '2026-04-28T10:00:00Z' });
    expect(s.createdAt).toBe('2026-04-28T10:00:00.000Z');
  });

  it('未知の grade は "elem-low" にフォールバック', () => {
    const s = toAnimationSummary({ ...row, grade: 'unknown-grade' });
    expect(s.grade).toBe('elem-low');
  });

  it('未知の subject は "science" にフォールバック', () => {
    const s = toAnimationSummary({ ...row, subject: 'invalid' });
    expect(s.subject).toBe('science');
  });

  it('全 grade enum がそのまま通る', () => {
    expect(toAnimationSummary({ ...row, grade: 'elem-high' }).grade).toBe('elem-high');
    expect(toAnimationSummary({ ...row, grade: 'middle'    }).grade).toBe('middle');
  });

  it('全 subject enum がそのまま通る', () => {
    expect(toAnimationSummary({ ...row, subject: 'math'   }).subject).toBe('math');
    expect(toAnimationSummary({ ...row, subject: 'social' }).subject).toBe('social');
  });
});

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
