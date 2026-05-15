'use client';

/**
 * components/admin/3d-models/AdminModelTable.tsx
 * familyai.jp / 管理画面 — 3D モデル一覧テーブル（Client Component）
 *
 * 既存 AdminArticleTable のサブセット相当:
 * - サブカテゴリ / 公開状態フィルタ
 * - ソート（最新 / 古い順 / 人気 / タイトル順）
 * - 公開トグル（楽観更新 + 失敗時ロールバック）
 * - 編集 / プレビュー / 削除（確認ダイアログ付き）
 * - ダブルクリック防止
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Tutor3dModel, Tutor3dSubject } from '@/shared';
import { TUTOR3D_SUBJECT_LABEL, TUTOR3D_SUBJECTS } from '@/shared';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type SortKey      = 'latest' | 'oldest' | 'popular' | 'title';
type PublishedKey = 'all' | 'true' | 'false';
const PAGE_SIZE = 50;

interface Props {
  initialModels: Tutor3dModel[];
  initialTotal?: number;
}

export function AdminModelTable({ initialModels, initialTotal }: Props) {
  const confirm = useConfirm();
  const [models,    setModels]    = useState<Tutor3dModel[]>(initialModels);
  const [search,    setSearch]    = useState('');
  const [subject,   setSubject]   = useState<Tutor3dSubject | 'all'>('all');
  const [published, setPublished] = useState<PublishedKey>('all');
  const [sort,      setSort]      = useState<SortKey>('latest');
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState<number>(initialTotal ?? initialModels.length);
  const [loading,   setLoading]   = useState(false);

  // 二重クリック防止
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set());
  const isRowPending = (slug: string) => pendingSlugs.has(slug);
  const markPending = (slug: string, on: boolean) =>
    setPendingSlugs((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug); else next.delete(slug);
      return next;
    });

  // ── API 主導の絞り込み + ソート（350ms debounce）─────────────
  const isFirstRender = useRef(true);
  useEffect(() => { setPage(1); }, [search, subject, published, sort]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      const q = search.trim();
      if (q)                       params.set('search',    q);
      if (subject !== 'all')       params.set('subject',   subject);
      if (published !== 'all')     params.set('published', published);
      params.set('sort',     sort);
      params.set('page',     String(page));
      params.set('pageSize', String(PAGE_SIZE));
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/3d-models?${params.toString()}`, {
          signal: controller.signal,
          cache:  'no-store',
        });
        if (!res.ok) return;
        const json = await res.json() as {
          ok:   boolean;
          data: {
            items: Tutor3dModel[];
            meta:  { total: number; totalPages: number };
          };
        };
        if (json.ok && Array.isArray(json.data.items)) {
          setModels(json.data.items);
          setTotal(json.data.meta.total);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[AdminModelTable] fetch failed:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, subject, published, sort, page]);

  // ── 公開トグル（楽観更新）─────────────────────────────────
  async function handleTogglePublish(slug: string) {
    if (isRowPending(slug)) return;
    const target = models.find((m) => m.slug === slug);
    if (!target) return;

    const optimisticPublished = !target.published;
    markPending(slug, true);
    setModels((prev) => prev.map((m) =>
      m.slug === slug ? { ...m, published: optimisticPublished } : m,
    ));

    try {
      const res = await fetch(`/api/admin/3d-models/${slug}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // ロールバック
      setModels((prev) => prev.map((m) =>
        m.slug === slug ? { ...m, published: target.published } : m,
      ));
      await confirm({
        title: '公開状態の更新に失敗しました',
        description: (err as Error).message,
        confirmLabel: 'OK',
        cancelLabel: '',
      });
    } finally {
      markPending(slug, false);
    }
  }

  // ── 削除（確認ダイアログ付き）─────────────────────────────
  async function handleDelete(slug: string, title: string) {
    if (isRowPending(slug)) return;
    const yes = await confirm({
      title: '本当に削除しますか？',
      description: `「${title}」(${slug}) を削除します。この操作は取り消せません。`,
      confirmLabel: '削除する',
      cancelLabel: 'キャンセル',
      destructive: true,
    });
    if (!yes) return;

    markPending(slug, true);
    try {
      const res = await fetch(`/api/admin/3d-models/${slug}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModels((prev) => prev.filter((m) => m.slug !== slug));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      await confirm({
        title: '削除に失敗しました',
        description: (err as Error).message,
        confirmLabel: 'OK',
        cancelLabel: '',
      });
    } finally {
      markPending(slug, false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* ── フィルタバー ───────────────────────────────────── */}
      <div style={filterBarStyle}>
        <input
          type="search"
          placeholder="タイトルで検索…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
          aria-label="タイトル検索"
        />
        <select value={subject} onChange={(e) => setSubject(e.target.value as Tutor3dSubject | 'all')} style={selectStyle}>
          <option value="all">すべてのジャンル</option>
          {TUTOR3D_SUBJECTS.map((s) => (
            <option key={s} value={s}>{TUTOR3D_SUBJECT_LABEL[s]}</option>
          ))}
        </select>
        <select value={published} onChange={(e) => setPublished(e.target.value as PublishedKey)} style={selectStyle}>
          <option value="all">すべて</option>
          <option value="true">公開のみ</option>
          <option value="false">非公開のみ</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectStyle}>
          <option value="latest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="popular">人気順</option>
          <option value="title">タイトル順</option>
        </select>
        {loading && <span style={{ fontSize: 12, color: '#6B7280' }}>読み込み中…</span>}
      </div>

      {/* ── テーブル ────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>タイトル / slug</th>
              <th style={thStyle}>ジャンル</th>
              <th style={thStyle}>学年</th>
              <th style={thNumStyle}>閲覧数</th>
              <th style={thStyle}>公開</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                  該当するモデルがありません
                </td>
              </tr>
            ) : models.map((m) => (
              <tr key={m.slug} style={{ borderTop: '1px solid #F3F4F6', opacity: isRowPending(m.slug) ? 0.5 : 1 }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>
                      {m.isFeatured && <span title="おすすめ" style={{ color: 'var(--shu)' }}>★ </span>}
                      {m.title}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>
                      {m.slug}
                    </span>
                  </div>
                </td>
                <td style={tdStyle}>{TUTOR3D_SUBJECT_LABEL[m.subject]}</td>
                <td style={tdStyle}>
                  {m.grade === 'elem-low' ? '小低' : m.grade === 'elem-high' ? '小高' : '中'}
                </td>
                <td style={tdNumStyle}>{m.viewCount.toLocaleString('ja-JP')}</td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(m.slug)}
                    disabled={isRowPending(m.slug)}
                    aria-label={`公開を切り替え（現在: ${m.published ? '公開中' : '非公開'}）`}
                    style={togglePillStyle(m.published)}
                  >
                    {m.published ? '公開中' : '非公開'}
                  </button>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link href={`/admin/3d-models/${m.slug}/preview`} style={linkBtnStyle}>プレビュー</Link>
                    <Link href={`/admin/3d-models/${m.slug}/edit`}    style={linkBtnStyle}>編集</Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.slug, m.title)}
                      disabled={isRowPending(m.slug)}
                      style={deleteBtnStyle}
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

      {/* ── ページネーション ───────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>
            ← 前へ
          </button>
          <span style={{ fontSize: 14, color: '#374151', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle}>
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}

// ── スタイル ──────────────────────────────────────────────
const filterBarStyle: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16,
};
const searchInputStyle: React.CSSProperties = {
  flex: '1 1 240px', minWidth: 200,
  padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14,
};
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
  fontSize: 14, background: '#fff', cursor: 'pointer',
};
const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 14,
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontWeight: 600,
  color: '#374151', background: '#F9FAFB', fontSize: 13,
};
const thNumStyle: React.CSSProperties = { ...thStyle, textAlign: 'right' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' };
const tdNumStyle: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' };
const linkBtnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: '#F3F4F6', color: '#374151', textDecoration: 'none',
  border: '1px solid #E5E7EB',
};
const deleteBtnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', cursor: 'pointer',
};
const pageBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  background: '#fff', color: '#374151', border: '1px solid #D1D5DB', cursor: 'pointer',
};
function togglePillStyle(published: boolean): React.CSSProperties {
  return {
    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
    background:  published ? '#D1FAE5' : '#FEF3C7',
    color:       published ? '#065F46' : '#92400E',
    border:      `1px solid ${published ? '#6EE7B7' : '#FDE68A'}`,
    cursor: 'pointer',
  };
}
