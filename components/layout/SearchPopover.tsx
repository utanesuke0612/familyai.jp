'use client';

/**
 * components/layout/SearchPopover.tsx
 * familyai.jp — グローバル検索ポップオーバー（Rev41）
 *
 * ヘッダーの検索アイコンをクリック → 検索パネルが出現。
 * 入力に応じて /api/search を呼び出し、リアルタイムに結果を表示。
 * 404 ページにも埋め込み可能（embed モード）。
 *
 * familyaidesign casual 準拠: washi 背景、shu アクセント、明朝見出し。
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { CATEGORY_LABEL, DIFFICULTY_LABEL } from '@/shared';
import type { ContentCategory, DifficultyLevel } from '@/shared';

interface SearchResult {
  slug:        string;
  title:       string;
  description: string | null;
  categories:  string[];
  level:       string;
}

interface Props {
  /** embed モード: true → 常時表示・ポップオーバーではなく埋め込み */
  embed?: boolean;
}

export function SearchPopover({ embed = false }: Props) {
  const [open, setOpen]         = useState(embed);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる（embed モードでは無効）
  useEffect(() => {
    if (embed || !open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [embed, open]);

  // ESC で閉じる
  useEffect(() => {
    if (embed || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [embed, open]);

  // 検索 debounce（300ms）
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        if (!res.ok) { setResults([]); return; }
        const json = await res.json();
        setResults((json.data as SearchResult[]) ?? []);
        setSelectedIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0 && results[selectedIdx]) {
      e.preventDefault();
      window.location.href = `/learn/${results[selectedIdx]!.slug}`;
    }
  }, [results, selectedIdx]);

  // 開いたときに入力にフォーカス
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const difficultyLabel = (level: string) =>
    DIFFICULTY_LABEL[level as DifficultyLevel] ?? level;

  // ── embed モード（404 ページ用）─────────────────────────
  if (embed) {
    return (
      <div ref={containerRef} style={{ width: '100%', maxWidth: 480 }}>
        {/* 検索入力 */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            padding:    '10px 14px',
            background: 'var(--washi)',
            border:     '1px solid var(--line)',
            borderRadius: 4,
          }}
        >
          <Search size={16} strokeWidth={1.5} style={{ color: 'var(--sumi-soft)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="記事を検索..."
            aria-label="記事を検索"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--sumi)',
              outline: 'none',
              fontFamily: 'var(--font-body)',
            }}
          />
          {loading && <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: 'var(--sumi-soft)' }} />}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults([]); }} type="button" aria-label="検索をクリア">
              <X size={14} strokeWidth={1.5} style={{ color: 'var(--sumi-soft)' }} />
            </button>
          )}
        </div>

        {/* 結果リスト */}
        {results.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: '8px 0 0',
              padding: 0,
              background: 'var(--washi)',
              border: '1px solid var(--line)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {results.map((r, i) => (
              <li key={r.slug} style={{ borderBottom: i < results.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <Link
                  href={`/learn/${r.slug}`}
                  style={{
                    display:    'block',
                    padding:    '10px 14px',
                    background: i === selectedIdx ? 'var(--washi-deep)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sumi)', display: 'block' }}>
                    {r.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--sumi-soft)', marginTop: 2, display: 'block' }}>
                    {r.categories?.map((c: string) => CATEGORY_LABEL[c as ContentCategory] ?? c).join(' · ')}
                    {' · '}
                    {difficultyLabel(r.level)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 結果なし */}
        {query.length >= 1 && !loading && results.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--sumi-soft)', marginTop: 8, textAlign: 'center' }}>
            記事が見つかりませんでした
          </p>
        )}
      </div>
    );
  }

  // ── ポップオーバーモード（ヘッダー用）─────────────────
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* 検索アイコン */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="記事を検索"
        aria-expanded={open}
        className="flex items-center justify-center transition-colors hover:bg-[var(--washi-deep)]"
        style={{
          width:  '36px',
          height: '36px',
          border: '1px solid var(--line)',
          color:  open ? 'var(--shu)' : 'var(--sumi-light)',
          background: open ? 'var(--washi-deep)' : 'transparent',
        }}
      >
        <Search strokeWidth={1.25} size={18} aria-hidden="true" />
      </button>

      {/* 検索パネル */}
      {open && (
        <div
          className="box-mingei"
          style={{
            position: 'absolute',
            right:    0,
            top:      'calc(100% + 8px)',
            width:    380,
            maxWidth: 'calc(100vw - 32px)',
            zIndex:   60,
            padding:  '12px',
          }}
        >
          {/* 入力 */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        8,
              padding:    '8px 12px',
              background: 'var(--washi-light)',
              border:     '1px solid var(--line)',
              borderRadius: 2,
            }}
          >
            <Search size={15} strokeWidth={1.5} style={{ color: 'var(--sumi-soft)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="記事を検索..."
              aria-label="記事を検索"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 14,
                color: 'var(--sumi)',
                outline: 'none',
                fontFamily: 'var(--font-body)',
              }}
            />
            {loading && <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: 'var(--sumi-soft)' }} />}
          </div>

          {/* 結果リスト */}
          {results.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
              {results.map((r, i) => (
                <li key={r.slug} style={{
                  borderBottom: i < results.length - 1 ? '1px solid var(--line-soft)' : 'none',
                }}>
                  <Link
                    href={`/learn/${r.slug}`}
                    onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
                    style={{
                      display:    'block',
                      padding:    '8px 12px',
                      background: i === selectedIdx ? 'var(--washi-deep)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sumi)', display: 'block' }}>
                      {r.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--sumi-soft)', marginTop: 1, display: 'block' }}>
                      {r.categories?.map((c: string) => CATEGORY_LABEL[c as ContentCategory] ?? c).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* 結果なし */}
          {query.length >= 1 && !loading && results.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--sumi-soft)', marginTop: 10, textAlign: 'center' }}>
              記事が見つかりませんでした
            </p>
          )}

          {/* フッター: 記事一覧で検索 */}
          {query.length >= 1 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
              <Link
                href={`/learn?search=${encodeURIComponent(query)}`}
                onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
                className="font-mincho inline-flex items-center gap-1 text-xs transition-colors hover:text-[var(--shu)]"
                style={{ color: 'var(--sumi-light)' }}
              >
                記事一覧で「{query}」を検索
                <ArrowRight size={11} strokeWidth={1.5} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
