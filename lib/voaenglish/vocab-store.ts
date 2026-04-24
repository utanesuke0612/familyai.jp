/**
 * lib/voaenglish/vocab-store.ts
 * familyai.jp — 単語ブックマーク（localStorage ベース）
 *
 * VOA レッスンの AnnotatedWord ツールチップから登録／解除され、
 * /tools/voaenglish/vocab ページで一覧表示される。
 *
 * - サーバーサイドでは空配列を返す（SSR フォールバック）
 * - 同一タブ内の変更は `familyai:vocab-changed` カスタムイベントで同期
 * - 他タブの変更は `storage` イベントで同期
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

export type VocabItem = {
  /** course/lesson/word をスラッシュでつないだ一意キー（小文字化） */
  id:           string;
  word:         string;
  meaning:      string;
  pron?:        string;
  example?:     string;
  course?:      string;
  lesson?:      string;
  lessonTitle?: string;
  /** エポックミリ秒 */
  addedAt:      number;
};

const STORAGE_KEY = 'familyai:vocab:bookmarks';
const CHANGE_EVENT = 'familyai:vocab-changed';

function read(): VocabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: VocabItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 登録する（既に同じ id がある場合は何もしない） */
export function addVocab(item: VocabItem): void {
  const list = read();
  if (list.some((i) => i.id === item.id)) return;
  list.push(item);
  write(list);
}

/** 解除する */
export function removeVocab(id: string): void {
  write(read().filter((i) => i.id !== id));
}

/** 登録済みかどうか */
export function hasVocab(id: string): boolean {
  return read().some((i) => i.id === id);
}

/** すべて取得（新しい順） */
export function getAllVocab(): VocabItem[] {
  return [...read()].sort((a, b) => b.addedAt - a.addedAt);
}

/** 一意キー生成 */
export function buildVocabId(course: string, lesson: string, word: string): string {
  return `${course}/${lesson}/${word.toLowerCase()}`;
}

/**
 * クライアント側で登録済みリストを購読する React フック。
 * 同一タブ内・他タブ両方の変更に反応する。
 */
export function useVocabList(): VocabItem[] {
  const [items, setItems] = useState<VocabItem[]>([]);
  useEffect(() => {
    setItems(getAllVocab());
    const sync = () => setItems(getAllVocab());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return items;
}

/**
 * 単一単語の登録状態を購読。ブックマーク切り替えは返り値の `toggle` から。
 */
export function useVocabBookmark(id: string): {
  bookmarked: boolean;
  toggle: (item: Omit<VocabItem, 'addedAt'>) => void;
} {
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    setBookmarked(hasVocab(id));
    const sync = () => setBookmarked(hasVocab(id));
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);

  const toggle = useCallback(
    (item: Omit<VocabItem, 'addedAt'>) => {
      if (hasVocab(item.id)) {
        removeVocab(item.id);
      } else {
        addVocab({ ...item, addedAt: Date.now() });
      }
    },
    [],
  );

  return { bookmarked, toggle };
}
