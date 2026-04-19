'use client';

/**
 * components/admin/AdminArticleTable.tsx
 * familyai.jp — 管理画面 記事一覧テーブル（Client Component）
 *
 * 機能:
 * - タイトル検索（クライアントサイド絞り込み）
 * - ソート：最新/古い順/人気順/タイトル順
 * - 公開/非公開トグル（API 呼び出し）
 * - 編集リンク・削除（確認ダイアログ付き）
 * - 閲覧数表示
 */

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Article } from '@/lib/db/schema';

type SortKey = 'latest' | 'oldest' | 'popular' | 'title';

interface Props {
  initialArticles: Article[];
}

export function AdminArticleTable({ initialArticles }: Props) {
  const router = useRouter();
  const [articles, setArticles]   = useState<Article[]>(initialArticles);
  const [search,   setSearch]     = useState('');
  const [sort,     setSort]       = useState<SortKey>('latest');
  const [, startTransition] = useTransition();

  // 二重クリック防止：アクション実行中の slug を保持
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set());
  const isRowPending = (slug: string) => pendingSlugs.has(slug);
  const markPending = (slug: string, on: boolean) =>
    setPendingSlugs((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug); else next.delete(slug);
      return next;
    });

  // ── クライアントサイド絞り込み + ソート ──────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q
      ? articles.filter((a) => a.title.toLowerCase().includes(q))
      : [...articles];

    result.sort((a, b) => {
      switch (sort) {
        case 'latest':  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
        case 'oldest':  return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
        case 'popular': return b.viewCount - a.viewCount;
        case 'title':   return a.title.localeCompare(b.title, 'ja');
      }
    });
    return result;
  }, [articles, search, sort]);

  // ── 公開トグル ────────────────────────────────────────────────
  async function handleToggle(slug: string) {
    if (isRowPending(slug)) return;     // 二重クリック防止
    markPending(slug, true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}/toggle`, { method: 'PATCH' });
      if (!res.ok) { alert('更新に失敗しました'); return; }
      const { data } = await res.json() as { data: { published: boolean } };
      setArticles((prev) =>
        prev.map((a) => a.slug === slug ? { ...a, published: data.published } : a),
      );
    } finally {
      markPending(slug, false);
    }
  }

  // ── 削除 ──────────────────────────────────────────────────────
  async function handleDelete(slug: string, title: string) {
    if (isRowPending(slug)) return;     // 二重クリック防止
    if (!confirm(`「${title}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    markPending(slug, true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}`, { method: 'DELETE' });
      if (!res.ok) { alert('削除に失敗しました'); return; }
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
      startTransition(() => router.refresh());
    } finally {
      markPending(slug, false);
    }
  }

  // ── フォーマット ──────────────────────────────────────────────
  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '—';

  return (
    <div>
      {/* ── ツールバー ── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 検索 */}
        <input
          type="search"
          placeholder="タイトルで検索…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            fontSize:     '14px',
            width:        '240px',
            outline:      'none',
          }}
        />

        {/* ソート */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            fontSize:     '14px',
            background:   'white',
            cursor:       'pointer',
          }}
        >
          <option value="latest">最新順</option>
          <option value="oldest">古い順</option>
          <option value="popular">人気順</option>
          <option value="title">タイトル順</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280' }}>
          {filtered.length} 件 / 全 {articles.length} 件
        </span>

        <Link
          href="/admin/articles/new"
          style={{
            padding:      '8px 16px',
            borderRadius: '8px',
            background:   'var(--color-orange)',
            color:        'white',
            fontSize:     '14px',
            fontWeight:   600,
            textDecoration: 'none',
          }}
        >
          ＋ 新規作成
        </Link>
      </div>

      {/* ── テーブル ── */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              {['状態', 'タイトル', 'ロール', '難易度', '閲覧数', '作成日', '操作'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                  記事が見つかりません
                </td>
              </tr>
            )}
            {filtered.map((article) => (
              <tr key={article.slug} style={{ borderBottom: '1px solid #F3F4F6' }}>
                {/* 状態トグル */}
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => handleToggle(article.slug)}
                    disabled={isRowPending(article.slug)}
                    title={article.published ? '非公開にする' : '公開にする'}
                    style={{
                      padding:      '4px 10px',
                      borderRadius: '999px',
                      border:       'none',
                      fontSize:     '12px',
                      fontWeight:   600,
                      cursor:       isRowPending(article.slug) ? 'not-allowed' : 'pointer',
                      opacity:      isRowPending(article.slug) ? 0.5 : 1,
                      background:   article.published ? '#D1FAE5' : '#F3F4F6',
                      color:        article.published ? '#065F46' : '#6B7280',
                    }}
                  >
                    {article.published ? '公開中' : '非公開'}
                  </button>
                </td>

                {/* タイトル */}
                <td style={{ padding: '10px 14px', maxWidth: '280px' }}>
                  <Link
                    href={`/admin/articles/${article.slug}/edit`}
                    style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {article.title}
                  </Link>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    /learn/{article.slug}
                  </div>
                </td>

                {/* ロール */}
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  {article.roles.join('・')}
                </td>

                {/* 難易度 */}
                <td style={{ padding: '10px 14px' }}>
                  <LevelBadge level={article.level} />
                </td>

                {/* 閲覧数 */}
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {article.viewCount.toLocaleString('ja-JP')}
                </td>

                {/* 作成日 */}
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#6B7280' }}>
                  {fmt(article.createdAt)}
                </td>

                {/* 操作 */}
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/admin/articles/${article.slug}/edit`}
                      style={actionBtnStyle('#EFF6FF', '#1D4ED8')}
                    >
                      編集
                    </Link>
                    {article.published && (
                      <Link
                        href={`/learn/${article.slug}`}
                        target="_blank"
                        style={actionBtnStyle('#F0FDF4', '#166534')}
                      >
                        表示
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(article.slug, article.title)}
                      disabled={isRowPending(article.slug)}
                      style={{
                        ...actionBtnStyle('#FEF2F2', '#B91C1C'),
                        border: 'none',
                        cursor: isRowPending(article.slug) ? 'not-allowed' : 'pointer',
                        opacity: isRowPending(article.slug) ? 0.5 : 1,
                      }}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 難易度バッジ ──────────────────────────────────────────────
function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    beginner:     { label: '初級', bg: '#D1FAE5', color: '#065F46' },
    intermediate: { label: '中級', bg: '#FEF3C7', color: '#92400E' },
    advanced:     { label: '上級', bg: '#FEE2E2', color: '#991B1B' },
  };
  const s = map[level] ?? { label: level, bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── アクションボタンスタイル ───────────────────────────────────
function actionBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding:        '4px 10px',
    borderRadius:   '6px',
    border:         'none',
    fontSize:       '12px',
    fontWeight:     600,
    background:     bg,
    color,
    textDecoration: 'none',
    display:        'inline-block',
  };
}
