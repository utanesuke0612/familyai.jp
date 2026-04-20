'use client';

/**
 * components/learn/LearnSearchBar.tsx
 * familyai.jp — 公開記事一覧の検索入力バー（Rev26 #2）
 *
 * - URL の ?search= と同期（サーバー側が SSR で読み取り ILIKE フィルタ）
 * - 入力中は debounce（350ms）して router.replace、履歴を汚さない
 * - 空文字 submit / クリアボタンで search を除去
 * - アクセシビリティ: label 付き input、Enter で即反映
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function LearnSearchBar() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(() => searchParams.get('search') ?? '');
  const timer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL 変化（ブラウザ戻る/進む・他 UI からのパラメータ変化）に追従
  useEffect(() => {
    setValue(searchParams.get('search') ?? '');
  }, [searchParams]);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed.length > 0) params.set('search', trimmed.slice(0, 100));
    else params.delete('search');
    // ページ番号は検索条件変更でリセット
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 350);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    commit(value);
  }

  function onClear() {
    setValue('');
    if (timer.current) clearTimeout(timer.current);
    commit('');
  }

  return (
    <form onSubmit={onSubmit} role="search" className="w-full">
      <label
        htmlFor="learn-search"
        className="block text-xs mb-1"
        style={{ color: 'var(--color-brown-light)' }}
      >
        記事を検索
      </label>
      <div className="relative flex items-center">
        <input
          id="learn-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          maxLength={100}
          placeholder="キーワード・タイトルで検索（例：ChatGPT）"
          value={value}
          onChange={onChange}
          className="w-full rounded-full border px-4 py-2 text-sm pr-10 min-h-[44px] focus:outline-none focus-visible:ring-2"
          style={{
            borderColor: 'var(--color-beige-dark)',
            background:  'white',
            color:       'var(--color-brown)',
          }}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="検索をクリア"
            className="absolute right-2 text-xs px-2 py-1 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-brown-light)' }}
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
}
