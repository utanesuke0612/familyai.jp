'use client';

/**
 * components/admin/AdminUserTable.tsx
 * familyai.jp — 管理画面 会員一覧テーブル（Client Component）
 *
 * 機能:
 * - email / name 検索（350ms デバウンス）
 * - プランフィルター（全員 / 無料 / 有料）
 * - ソート：新着順 / 古い順 / 名前順 / プラン順
 * - ページネーション（50件ずつ）
 */

import { useState, useEffect, useRef, useCallback } from 'react';

type PlanFilter = 'all' | 'free' | 'premium';
type SortKey    = 'newest' | 'oldest' | 'name' | 'plan';

interface UserRow {
  id:           string;
  email:        string;
  name:         string | null;
  plan:         string;
  authProvider: string;
  createdAt:    string;
}

interface Summary { free: number; premium: number; total: number }

interface Props {
  initialUsers:   UserRow[];
  initialTotal:   number;
  initialSummary: Summary | null;
}

const PAGE_SIZE = 50;

// ── スタイル定数 ──────────────────────────────────────────────
const cell: React.CSSProperties = {
  padding:   '10px 14px',
  fontSize:  '13px',
  color:     '#374151',
  borderBottom: '1px solid #F3F4F6',
  whiteSpace: 'nowrap',
};

const planBadge = (plan: string): React.CSSProperties => ({
  display:      'inline-block',
  padding:      '2px 10px',
  borderRadius: '99px',
  fontSize:     '11px',
  fontWeight:   700,
  background:   plan === 'premium' ? '#FEF3C7' : '#F3F4F6',
  color:        plan === 'premium' ? '#92400E' : '#6B7280',
  border:       plan === 'premium' ? '1px solid #FDE68A' : '1px solid #E5E7EB',
});

const providerBadge = (p: string): React.CSSProperties => ({
  display:      'inline-block',
  padding:      '2px 8px',
  borderRadius: '99px',
  fontSize:     '11px',
  fontWeight:   600,
  background:   p === 'google' ? '#EFF6FF' : '#F9FAFB',
  color:        p === 'google' ? '#1D4ED8' : '#6B7280',
  border:       p === 'google' ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ── コンポーネント ────────────────────────────────────────────
export function AdminUserTable({ initialUsers, initialTotal, initialSummary }: Props) {
  const [users,   setUsers]   = useState<UserRow[]>(initialUsers);
  const [search,  setSearch]  = useState('');
  const [plan,    setPlan]    = useState<PlanFilter>('all');
  const [sort,    setSort]    = useState<SortKey>('newest');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(initialTotal);
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (s: string, pl: PlanFilter, so: SortKey, pg: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search:   s,
          plan:     pl,
          sort:     so,
          page:     String(pg),
          pageSize: String(PAGE_SIZE),
        });
        const res  = await fetch(`/api/admin/users?${params}`);
        const json = await res.json();
        if (json.ok) {
          setUsers(json.data.items);
          setTotal(json.data.meta.total);
          if (json.data.summary) setSummary(json.data.summary);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 検索はデバウンス
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(search, plan, sort, 1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, plan, sort, fetchUsers]);

  // ページ変更は即時
  useEffect(() => {
    fetchUsers(search, plan, sort, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      {/* ── サマリーカード ── */}
      {summary && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { label: '全会員',    value: summary.total,   bg: '#F9FAFB', border: '#E5E7EB', color: '#111827' },
            { label: '無料会員',  value: summary.free,    bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280' },
            { label: '有料会員',  value: summary.premium, bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
          ].map(({ label, value, bg, border, color }) => (
            <div
              key={label}
              style={{
                flex:         '1 1 140px',
                padding:      '16px 20px',
                borderRadius: '12px',
                background:   bg,
                border:       `1px solid ${border}`,
              }}
            >
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, marginBottom: '4px' }}>{label}</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color, margin: 0, lineHeight: 1 }}>
                {value.toLocaleString('ja-JP')}
                <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>名</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── フィルターバー ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="メール / 名前で検索…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex:         '1 1 220px',
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #E5E7EB',
            fontSize:     '13px',
            outline:      'none',
          }}
        />

        {/* プランフィルター */}
        <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {(['all', 'free', 'premium'] as PlanFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPlan(p); setPage(1); }}
              style={{
                padding:    '8px 14px',
                fontSize:   '13px',
                fontWeight: plan === p ? 700 : 400,
                background: plan === p ? '#111827' : 'white',
                color:      plan === p ? 'white' : '#374151',
                border:     'none',
                cursor:     'pointer',
              }}
            >
              {p === 'all' ? '全員' : p === 'free' ? '無料' : '有料'}
            </button>
          ))}
        </div>

        {/* ソート */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
          style={{
            padding:      '8px 12px',
            borderRadius: '8px',
            border:       '1px solid #E5E7EB',
            fontSize:     '13px',
            background:   'white',
            cursor:       'pointer',
          }}
        >
          <option value="newest">新着順</option>
          <option value="oldest">古い順</option>
          <option value="name">名前順</option>
          <option value="plan">プラン順</option>
        </select>

        <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: 'auto' }}>
          {loading ? '読み込み中…' : `${total.toLocaleString('ja-JP')} 件`}
        </span>
      </div>

      {/* ── テーブル ── */}
      <div style={{ borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['メール', '名前', 'プラン', '認証', '登録日'].map((h) => (
                <th
                  key={h}
                  style={{
                    ...cell,
                    fontWeight:  600,
                    color:       '#6B7280',
                    fontSize:    '12px',
                    textAlign:   'left',
                    borderBottom: '2px solid #E5E7EB',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...cell, textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                  {loading ? '読み込み中…' : '会員が見つかりません'}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={cell}>{u.email}</td>
                  <td style={{ ...cell, color: u.name ? '#111827' : '#9CA3AF' }}>
                    {u.name ?? '—'}
                  </td>
                  <td style={cell}>
                    <span style={planBadge(u.plan)}>
                      {u.plan === 'premium' ? '⭐ 有料' : '無料'}
                    </span>
                  </td>
                  <td style={cell}>
                    <span style={providerBadge(u.authProvider)}>
                      {u.authProvider === 'google' ? 'Google' : u.authProvider}
                    </span>
                  </td>
                  <td style={{ ...cell, color: '#6B7280' }}>{formatDate(u.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── ページネーション ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              border: '1px solid #E5E7EB', background: 'white',
              fontSize: '13px', cursor: page === 1 ? 'default' : 'pointer',
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            ← 前
          </button>
          <span style={{ fontSize: '13px', color: '#6B7280', lineHeight: '34px' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              border: '1px solid #E5E7EB', background: 'white',
              fontSize: '13px', cursor: page === totalPages ? 'default' : 'pointer',
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            次 →
          </button>
        </div>
      )}
    </div>
  );
}
