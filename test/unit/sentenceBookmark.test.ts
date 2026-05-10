/**
 * test/unit/sentenceBookmark.test.ts
 * familyai.jp — Rev34 センテンスブックマークの純粋関数テスト
 *
 * `useSentenceBookmark` 等の React フックは jsdom + next-auth が必要なため
 * 別途統合テストで検証する想定。ここではビュー無依存の関数のみ。
 */

import { describe, it, expect } from 'vitest';
import {
  buildSentenceId,
  plainifySentence,
} from '@/lib/voaenglish/sentence-bookmark-store';
import { toSentenceBookmarkItem } from '@/lib/mappers/sentence-bookmarks';

describe('buildSentenceId', () => {
  it('builds canonical id from course + lesson + index', () => {
    expect(buildSentenceId('01_03_Level2', 'lesson-05', 12))
      .toBe('01_03_Level2/lesson-05/12');
  });

  it('handles index 0', () => {
    expect(buildSentenceId('anna', 'lesson-01', 0)).toBe('anna/lesson-01/0');
  });
});

describe('plainifySentence', () => {
  it('strips speaker prefix (旧形式 Speaker: text)', () => {
    expect(plainifySentence('Anna: Hi! Are you Anna?')).toBe('Hi! Are you Anna?');
  });

  it('strips markdown speaker (**Speaker:** text)', () => {
    expect(plainifySentence('**Anna:** Hi! Are you Anna?')).toBe('Hi! Are you Anna?');
  });

  it('strips markdown speaker (**Speaker**: text)', () => {
    expect(plainifySentence('**Anna**: Hi! Are you Anna?')).toBe('Hi! Are you Anna?');
  });

  it('expands {word|reading} annotation to word only', () => {
    expect(plainifySentence('I {ate|ɑʊt} an apple.')).toBe('I ate an apple.');
  });

  it('strips bold markdown', () => {
    expect(plainifySentence('This is **important**.')).toBe('This is important.');
  });

  it('chains all transforms together', () => {
    const annotated = '**Pete:** Look at the {pumpkin|ˈpʌmpkɪn}, it is **huge**!';
    expect(plainifySentence(annotated)).toBe('Look at the pumpkin, it is huge!');
  });

  it('returns trimmed input when nothing to strip', () => {
    expect(plainifySentence('  plain text.  ')).toBe('plain text.');
  });

  it('handles speaker with multi-word name', () => {
    expect(plainifySentence('**Dr Jill:** Welcome.')).toBe('Welcome.');
  });
});

describe('toSentenceBookmarkItem', () => {
  it('maps DB row to DTO with all optional fields', () => {
    const row = {
      sentenceId:  'anna/lesson-01/3',
      text:        '**Anna:** Hi!',
      textPlain:   'Hi!',
      startSec:    12.5,
      endSec:      14.2,
      speaker:     'Anna',
      course:      'anna',
      lesson:      'lesson-01',
      lessonTitle: 'Welcome',
      audioUrl:    'https://blob.example.com/anna-01.mp3',
      note:        'memo',
      addedAt:     1700000000000,
    };
    const item = toSentenceBookmarkItem(row);
    expect(item).toEqual({
      id:          'anna/lesson-01/3',
      text:        '**Anna:** Hi!',
      textPlain:   'Hi!',
      startSec:    12.5,
      endSec:      14.2,
      speaker:     'Anna',
      course:      'anna',
      lesson:      'lesson-01',
      lessonTitle: 'Welcome',
      audioUrl:    'https://blob.example.com/anna-01.mp3',
      note:        'memo',
      addedAt:     1700000000000,
    });
  });

  it('converts null fields to undefined (shared/types contract)', () => {
    const row = {
      sentenceId:  'anna/lesson-01/3',
      text:        'Hi.',
      textPlain:   'Hi.',
      startSec:    0,
      endSec:      0,
      speaker:     null,
      course:      'anna',
      lesson:      'lesson-01',
      lessonTitle: null,
      audioUrl:    null,
      note:        null,
      addedAt:     1700000000000,
    };
    const item = toSentenceBookmarkItem(row);
    expect(item.speaker).toBeUndefined();
    expect(item.lessonTitle).toBeUndefined();
    expect(item.audioUrl).toBeUndefined();
    expect(item.note).toBeUndefined();
  });
});
