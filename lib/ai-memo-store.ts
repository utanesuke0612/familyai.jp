'use client';

/**
 * lib/ai-memo-store.ts
 * familyai.jp — AIメモ帳（localStorage ベース）
 *
 * AIChatWidget の AI 回答を 📌 ボタンで保存し、
 * /mypage/aimemo ページで一覧表示する。
 */

import { useEffect, useState, useCallback } from 'react';

export type AiMemoItem = {
  /** crypto.randomUUID() */
  id:           string;
  /** 保存した AI の回答テキスト */
  answer:       string;
  /** 対応するユーザーの質問 */
  question:     string;
  /** 記事タイトル */
  articleTitle: string;
  /** 記事スラッグ（あれば） */
  articleSlug?: string;
  /** エポックミリ秒 */
  savedAt:      number;
};

const STORAGE_KEY  = 'familyai:aimemo:bookmarks';
const CHANGE_EVENT = 'familyai:aimemo-changed';

function read(): AiMemoItem[] {
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

function write(items: AiMemoItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 保存する */
export function addAiMemo(item: AiMemoItem): void {
  const list = read();
  if (list.some((i) => i.id === item.id)) return;
  list.push(item);
  write(list);
}

/** 削除する */
export function removeAiMemo(id: string): void {
  write(read().filter((i) => i.id !== id));
}

/** 保存済みかどうか */
export function hasAiMemo(id: string): boolean {
  return read().some((i) => i.id === id);
}

/** 全件取得（新しい順） */
export function getAllAiMemos(): AiMemoItem[] {
  return [...read()].sort((a, b) => b.savedAt - a.savedAt);
}

/** 一覧を購読する React フック */
export function useAiMemoList(): AiMemoItem[] {
  const [items, setItems] = useState<AiMemoItem[]>([]);
  useEffect(() => {
    setItems(getAllAiMemos());
    const sync = () => setItems(getAllAiMemos());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return items;
}

/** 単一メモの保存状態を購読 */
export function useAiMemoBookmark(id: string): {
  saved:  boolean;
  toggle: (item: Omit<AiMemoItem, 'savedAt'>) => void;
} {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(hasAiMemo(id));
    const sync = () => setSaved(hasAiMemo(id));
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);

  const toggle = useCallback(
    (item: Omit<AiMemoItem, 'savedAt'>) => {
      if (hasAiMemo(item.id)) {
        removeAiMemo(item.id);
      } else {
        addAiMemo({ ...item, savedAt: Date.now() });
      }
    },
    [],
  );

  return { saved, toggle };
}
