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

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Article } from '@/lib/db/schema';
import { CATEGORY_LABEL } from '@/shared';
import type { ContentCategory } from '@/shared';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type SortKey = 'latest' | 'oldest' | 'popular' | 'title';

const PAGE_SIZE = 50;
const CATEGORIES: ContentCategory[] = ['education', 'lifestyle', 'work', 'creative'];

interface Props {
  initialArticles: Article[];
  /** Rev24 #④: 件数表示とページング用の総件数（初期値） */
  initialTotal?:   number;
}

export function AdminArticleTable({ initialArticles, initialTotal }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [articles, setArticles]   = useState<Article[]>(initialArticles);
  const [search,   setSearch]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory | ''>('');
  const [tagFilter, setTagFilter] = useState('');
  const [sort,     setSort]       = useState<SortKey>('latest');
  const [page,     setPage]       = useState(1);
  const [total,    setTotal]      = useState<number>(initialTotal ?? initialArticles.length);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Rev28 #HIGH-9: alert() を置換する SR 通知トースト（aria-live アナウンス領域）
  const [flash, setFlash] = useState<{ kind: 'error' | 'info'; message: string } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 二重クリック防止：アクション実行中の slug を保持
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set());
  const isRowPending = (slug: string) => pendingSlugs.has(slug);
  const markPending = (slug: string, on: boolean) =>
    setPendingSlugs((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug); else next.delete(slug);
      return next;
    });

  // ── API 主導のサーバーサイド絞り込み + ソート（Rev26 #5）────
  // initial render では SSR の initialArticles を使用、以降 search/sort 変更時に
  // /api/admin/articles を叩いて結果を取得（350ms debounce）。
  const isFirstRender = useRef(true);
  const [loading, setLoading] = useState(false);

  // 検索・ソート変更時は 1 ページ目に戻す
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, tagFilter, sort]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      const q = search.trim();
      const tag = tagFilter.trim();
      if (q) params.set('search', q);
      if (categoryFilter) params.set('category', categoryFilter);
      if (tag) params.set('tag', tag.slice(0, 32));
      params.set('sort',     sort);
      params.set('page',     String(page));
      params.set('pageSize', String(PAGE_SIZE));
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/articles?${params.toString()}`, {
          signal: controller.signal,
          cache:  'no-store',
        });
        if (!res.ok) return;
        const json = await res.json() as {
          ok:   boolean;
          data: {
            items: Article[];
            meta:  { page: number; pageSize: number; total: number; totalPages: number };
          };
        };
        if (json.ok && json.data && Array.isArray(json.data.items)) {
          // createdAt は JSON で string になるので Date に復元
          setArticles(
            json.data.items.map((a) => ({
              ...a,
              createdAt:   a.createdAt   ? new Date(a.createdAt)   : a.createdAt,
              updatedAt:   a.updatedAt   ? new Date(a.updatedAt)   : a.updatedAt,
              publishedAt: a.publishedAt ? new Date(a.publishedAt) : a.publishedAt,
            })) as Article[],
          );
          setTotal(json.data.meta.total);
        }
      } catch {
        // AbortError はスキップ
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, categoryFilter, tagFilter, sort, page]);

  // L-4: filtered は articles の無意味なエイリアスだったため削除
  const visibleSlugs = articles.map((article) => article.slug);
  const selectedArticles = articles.filter((article) => selectedSlugs.has(article.slug));
  const allVisibleSelected = visibleSlugs.length > 0 && visibleSlugs.every((slug) => selectedSlugs.has(slug));
  const someVisibleSelected = visibleSlugs.some((slug) => selectedSlugs.has(slug));

  useEffect(() => {
    const currentSlugs = new Set(articles.map((article) => article.slug));
    setSelectedSlugs((prev) => new Set(Array.from(prev).filter((slug) => currentSlugs.has(slug))));
  }, [articles]);

  // ── 公開トグル ────────────────────────────────────────────────
  async function handleToggle(slug: string) {
    if (isRowPending(slug)) return;     // 二重クリック防止
    markPending(slug, true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}/toggle`, { method: 'PATCH' });
      if (!res.ok) { setFlash({ kind: 'error', message: '更新に失敗しました' }); return; }
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
    // CX-3: window.confirm → 共通 ConfirmDialog
    const ok = await confirm({
      title:        `「${title}」を削除しますか？`,
      description:  'この操作は元に戻せません。記事および関連メタデータが完全に削除されます。',
      confirmLabel: '削除する',
      cancelLabel:  'キャンセル',
      destructive:  true,
    });
    if (!ok) return;
    markPending(slug, true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}`, { method: 'DELETE' });
      if (!res.ok) { setFlash({ kind: 'error', message: '削除に失敗しました' }); return; }
      // Rev28 #HIGH-4: 総件数・ページング整合を維持
      // 最終ページの最終行を消したときはページを 1 つ戻す（useEffect で再フェッチ）
      const nextTotal = Math.max(0, total - 1);
      setTotal(nextTotal);
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      if (page > nextTotalPages) setPage(nextTotalPages);
      startTransition(() => router.refresh());
    } finally {
      markPending(slug, false);
    }
  }

  function toggleSelection(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleSlugs.forEach((slug) => next.delete(slug));
      } else {
        visibleSlugs.forEach((slug) => next.add(slug));
      }
      return next;
    });
  }

  function exportSelectedAsMarkdown() {
    if (selectedArticles.length === 0) {
      setFlash({ kind: 'error', message: 'エクスポートする記事を選択してください' });
      return;
    }

    // L-3: ブラウザのブロック防止のため 200ms ずつ遅延してダウンロードを順次発火する
    selectedArticles.forEach((article, i) => {
      setTimeout(() => {
        const blob = new Blob([toMarkdown(article)], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.slug}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, i * 200);
    });

    setFlash({
      kind:    'info',
      message: `${selectedArticles.length} 件の Markdown をエクスポートしました`,
    });
  }

  // ── フォーマット ──────────────────────────────────────────────
  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '—';

  return (
    <div>
      {/* Rev28 #HIGH-9: alert() 置換のトースト（SR に読み上げさせる） */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position:      'fixed',
          top:           '16px',
          right:         '16px',
          zIndex:        60,
          pointerEvents: flash ? 'auto' : 'none',
        }}
      >
        {flash && (
          <div
            style={{
              padding:      '10px 14px',
              borderRadius: '8px',
              fontSize:     '13px',
              fontWeight:   600,
              background:   flash.kind === 'error' ? '#FEF2F2' : '#ECFDF5',
              color:        flash.kind === 'error' ? '#B91C1C' : '#047857',
              border:       `1px solid ${flash.kind === 'error' ? '#FECACA' : '#A7F3D0'}`,
              boxShadow:    '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {flash.message}
          </div>
        )}
      </div>

      {/* ── ツールバー ── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 検索 */}
        <input
          type="search"
          placeholder="タイトルで検索…"
          aria-label="記事タイトルで検索"
          aria-busy={loading || undefined}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            fontSize:     '14px',
            width:        '144px',
          }}
        />

        {/* 分類 */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ContentCategory | '')}
          aria-label="分類で絞り込み"
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            fontSize:     '14px',
            background:   'white',
            cursor:       'pointer',
          }}
        >
          <option value="">分類すべて</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>
          ))}
        </select>

        {/* タグ */}
        <input
          type="search"
          placeholder="タグで絞り込み…"
          aria-label="記事タグで絞り込み"
          aria-busy={loading || undefined}
          maxLength={32}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            fontSize:     '14px',
            width:        '180px',
          }}
        />

        {/* ソート */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="ソート順序"
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

        <button
          type="button"
          onClick={exportSelectedAsMarkdown}
          disabled={selectedArticles.length === 0}
          style={{
            padding:      '8px 14px',
            borderRadius: '8px',
            border:       '1px solid #D1D5DB',
            background:   selectedArticles.length === 0 ? '#F3F4F6' : 'white',
            color:        selectedArticles.length === 0 ? '#9CA3AF' : '#111827',
            fontSize:     '14px',
            fontWeight:   600,
            cursor:       selectedArticles.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          MDエクスポート（{selectedArticles.length}）
        </button>

        <Link
          href="/admin/articles/new"
          style={{
            padding:      '8px 16px',
            borderRadius: '8px',
            background:   'var(--shu)',
            color:        'white',
            fontSize:     '14px',
            fontWeight:   600,
            textDecoration: 'none',
            whiteSpace:   'nowrap',
          }}
        >
          ＋ 新規作成
        </Link>

        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280' }}>
          {loading
            ? '読み込み中…'
            : `${articles.length} / ${total.toLocaleString('ja-JP')} 件（${page} / ${totalPages} ページ）`}
        </span>
      </div>

      {/* ── テーブル ── */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: '44px' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  aria-label="表示中の記事をすべて選択"
                  style={{ width: '16px', height: '16px', accentColor: 'var(--shu)' }}
                />
              </th>
              {['状態', 'タイトル', '分類', 'タグ', '難易度', '閲覧数', '作成日', '操作'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                  記事が見つかりません
                </td>
              </tr>
            )}
            {articles.map((article) => (
              <tr key={article.slug} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedSlugs.has(article.slug)}
                    onChange={() => toggleSelection(article.slug)}
                    aria-label={`「${article.title}」を選択`}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--shu)' }}
                  />
                </td>

                {/* 状態トグル */}
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => handleToggle(article.slug)}
                    disabled={isRowPending(article.slug)}
                    title={article.published ? '非公開にする' : '公開にする'}
                    aria-label={
                      article.published
                        ? `公開状態を切り替え（現在: 公開中・クリックで非公開）— ${article.title}`
                        : `公開状態を切り替え（現在: 非公開・クリックで公開）— ${article.title}`
                    }
                    aria-pressed={article.published}
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

                {/* 分類 */}
                <td style={{ padding: '10px 14px', minWidth: '140px' }}>
                  <CategoryBadges categories={article.categories} />
                </td>

                {/* タグ */}
                <td style={{ padding: '10px 14px', minWidth: '160px', maxWidth: '260px' }}>
                  <TagBadges tags={article.tags ?? []} />
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

      {/* ── ページネーション（Rev24 #④）── */}
      {totalPages > 1 && (
        <div
          style={{
            display:        'flex',
            gap:            '8px',
            alignItems:     'center',
            justifyContent: 'center',
            marginTop:      '1rem',
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            style={pagerBtnStyle(page <= 1 || loading)}
            aria-label="前のページ"
          >
            ← 前へ
          </button>
          <span style={{ fontSize: '13px', color: '#374151', minWidth: '80px', textAlign: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            style={pagerBtnStyle(page >= totalPages || loading)}
            aria-label="次のページ"
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}


function toMarkdown(article: Article): string {
  const frontmatter = [
    '---',
    `title: ${formatScalar(article.title)}`,
    `description: ${article.description ? formatScalar(article.description) : '~'}`,
    `categories: ${formatArray(article.categories)}`,
    `tags: ${formatArray(article.tags ?? [])}`,
    `level: ${article.level}`,
    `published: ${article.published ? 'true' : 'false'}`,
    `publishedAt: ${formatDateForFrontmatter(article.publishedAt)}`,
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${article.body.trim()}\n`;
}

function formatScalar(value: string): string {
  return JSON.stringify(value);
}

function formatArray(values: string[]): string {
  if (values.length === 0) return '[]';
  return `[${values.map(formatScalar).join(', ')}]`;
}

function formatDateForFrontmatter(value: Date | string | null): string {
  if (!value) return '~';
  return new Date(value).toISOString().slice(0, 10);
}

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding:      '6px 14px',
    borderRadius: '8px',
    border:       '1px solid #D1D5DB',
    background:   disabled ? '#F3F4F6' : 'white',
    color:        disabled ? '#9CA3AF' : '#111827',
    fontSize:     '13px',
    fontWeight:   500,
    cursor:       disabled ? 'not-allowed' : 'pointer',
  };
}

// ── 分類・タグバッジ ──────────────────────────────────────────
function CategoryBadges({ categories }: { categories: string[] }) {
  if (categories.length === 0) return <span style={emptyTextStyle}>—</span>;
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {categories.map((category) => {
        const key = category as ContentCategory;
        return (
          <span key={category} style={pillStyle('#EFF6FF', '#1D4ED8')}>
            {CATEGORY_LABEL[key] ?? category}
          </span>
        );
      })}
    </div>
  );
}

function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span style={emptyTextStyle}>—</span>;
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {tags.map((tag) => (
        <span key={tag} style={pillStyle('#F5F3FF', '#6D28D9')}>
          #{tag}
        </span>
      ))}
    </div>
  );
}

function pillStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding:      '2px 7px',
    borderRadius: '999px',
    background:   bg,
    color,
    fontSize:     '12px',
    fontWeight:   600,
    lineHeight:   1.6,
    whiteSpace:   'nowrap',
  };
}

const emptyTextStyle: React.CSSProperties = { color: '#9CA3AF', fontSize: '12px' };

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
    fontFamily:     'inherit',
    lineHeight:     1,
    background:     bg,
    color,
    textDecoration: 'none',
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       '48px',
    height:         '26px',
    boxSizing:      'border-box',
  };
}
