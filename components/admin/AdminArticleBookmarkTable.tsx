'use client';

/**
 * components/admin/AdminArticleBookmarkTable.tsx
 * familyai.jp — 管理画面 記事ブックマーク一覧テーブル
 */

import { useState, useMemo } from 'react';
import { formatDateJa }      from '@/shared';

interface BookmarkRow {
  id:           string;
  articleSlug:  string;
  articleTitle: string;
  createdAt:    string;
  userEmail:    string;
  userName:     string | null;
}

interface Props {
  initialBookmarks: BookmarkRow[];
  initialTotal:     number;
}

export function AdminArticleBookmarkTable({ initialBookmarks, initialTotal }: Props) {
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>(initialBookmarks);
  const [total,     setTotal]     = useState(initialTotal);
  const [search,    setSearch]    = useState('');
  const [deleting,  setDeleting]  = useState<string | null>(null);

  // クライアントサイドフィルタ
  const filtered = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.articleSlug.toLowerCase().includes(q) ||
        b.articleTitle.toLowerCase().includes(q) ||
        b.userEmail.toLowerCase().includes(q) ||
        (b.userName ?? '').toLowerCase().includes(q),
    );
  }, [bookmarks, search]);

  // 削除
  const handleDelete = async (id: string) => {
    if (!window.confirm('このブックマークを削除しますか？')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/article-bookmarks?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? '削除に失敗しました');
        return;
      }
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      alert('ネットワークエラーが発生しました');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* 検索 */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="記事スラッグ / タイトル / メールで絞り込み"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width:        '100%',
            maxWidth:     '400px',
            padding:      '8px 12px',
            border:       '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize:     '14px',
            outline:      'none',
          }}
        />
        {search && (
          <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: '12px' }}>
            {filtered.length} 件表示中
          </span>
        )}
      </div>

      {/* テーブル */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
              <th style={thStyle}>記事</th>
              <th style={thStyle}>ユーザー</th>
              <th style={thStyle}>ブックマーク日時</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                  {search ? '一致するブックマークはありません' : 'ブックマークがありません'}
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {/* 記事 */}
                  <td style={tdStyle}>
                    <a
                      href={`/learn/${b.articleSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#111827', fontWeight: 500, textDecoration: 'none' }}
                    >
                      {b.articleTitle}
                    </a>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                      {b.articleSlug}
                    </div>
                  </td>

                  {/* ユーザー */}
                  <td style={tdStyle}>
                    <div style={{ color: '#374151' }}>{b.userEmail}</div>
                    {b.userName && (
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        {b.userName}
                      </div>
                    )}
                  </td>

                  {/* 日時 */}
                  <td style={{ ...tdStyle, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {formatDateJa(b.createdAt)}
                  </td>

                  {/* 削除 */}
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={deleting === b.id}
                      style={{
                        padding:      '4px 10px',
                        fontSize:     '12px',
                        borderRadius: '4px',
                        border:       '1px solid #FCA5A5',
                        background:   '#FEF2F2',
                        color:        '#DC2626',
                        cursor:       deleting === b.id ? 'wait' : 'pointer',
                        opacity:      deleting === b.id ? 0.6 : 1,
                      }}
                    >
                      {deleting === b.id ? '削除中…' : '削除'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
        ※ 表示は最新 50 件。全件検索は /api/admin/article-bookmarks から取得できます。
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding:    '8px 12px',
  fontWeight: 600,
  color:      '#374151',
  fontSize:   '13px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
};
