'use client';

/**
 * components/learn/LearnSearchBar.tsx
 * familyai.jp — 公開記事一覧の検索入力バー（Rev26 #2）
 *
 * - URL の ?search= と同期（サーバー側が SSR で読み取り ILIKE フィルタ）
 * - 入力中は debounce（350ms）して router.replace、履歴を汚さない
 * - 空文字 submit / クリアボタンで search を除去
 * - アクセシビリティ: label 付き input、Enter で即反映
 *
 * Rev40 Phase I+: インラインラベル化（並び順・難易度と同じ 1 行に並べる）
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
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex items-center gap-2 w-full sm:w-auto"
    >
      <label
        htmlFor="learn-search"
        className="font-mincho text-xs tracking-wide shrink-0"
        style={{ color: 'var(--sumi-light)' }}
      >
        <span className="ornament mr-1" aria-hidden="true">⁂</span>
        記事を検索：
      </label>
      <div className="relative flex items-center flex-1 sm:flex-none sm:w-72">
        <input
          id="learn-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          maxLength={100}
          placeholder="キーワード（例：ChatGPT）"
          value={value}
          onChange={onChange}
          className="w-full font-mincho border px-3 py-1.5 text-xs pr-8 min-h-[36px] focus:outline-none focus-visible:ring-1"
          style={{
            borderColor:  'var(--line)',
            background:   'var(--washi-light)',
            color:        'var(--sumi)',
            borderRadius: '4px',
          }}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="検索をクリア"
            className="absolute right-2 text-sm px-1 hover:opacity-70 transition-opacity font-mincho"
            style={{ color: 'var(--sumi-light)' }}
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
}
