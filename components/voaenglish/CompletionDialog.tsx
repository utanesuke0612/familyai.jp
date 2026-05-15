'use client';

/**
 * components/voaenglish/CompletionDialog.tsx
 * familyai.jp — Dictation 全再生完了時の自己申告モーダル（R3-機能3 Phase 6）
 *
 * 全センテンス再生終了 → audio.ended → 自動的にモーダル表示（Q5=C）
 * ユーザーが 😓💪🌟 を選択 → onSelect コールバック → モーダル閉じる
 *
 * 非ログインユーザーには「ログインで進捗を保存できます」と促す（Q4=B）
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SelfReport, type SelfReportAction } from './SelfReport';

interface CompletionDialogProps {
  isLoggedIn:  boolean;
  isSubmitting: boolean;
  lessonTitle: string;
  onSelect:    (action: SelfReportAction) => void;
  onClose:     () => void;
}

export function CompletionDialog({
  isLoggedIn,
  isSubmitting,
  lessonTitle,
  onSelect,
  onClose,
}: CompletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC でクローズ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isSubmitting]);

  // モーダルオープン時にフォーカスを移動
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.5)',
        padding:    16,
      }}
      onClick={(e) => {
        // 背景クリックでクローズ（送信中は無視）
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md p-6 sm:p-7 outline-none"
        style={{
          background:   'white',
          border:       '1px solid var(--line)',
          borderRadius: '4px',
          boxShadow:    '0 20px 60px rgba(0,0,0,0.25)',
          maxHeight:    '90vh',
          overflowY:    'auto',
        }}
      >
        {/* ヘッダー */}
        <div className="text-center mb-5">
          <h2
            id="completion-dialog-title"
            className="font-mincho leading-tight"
            style={{
              fontSize:   'clamp(20px, 2.5vw, 24px)',
              fontWeight: 500,
              color:      'var(--sumi)',
            }}
          >
            お疲れさまでした
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--sumi-light)' }}
          >
            「{lessonTitle.length > 30 ? lessonTitle.slice(0, 30) + '…' : lessonTitle}」<br />
            の聴写、どうでしたか？
          </p>
        </div>

        {/* 自己申告 3 ボタン */}
        <SelfReport
          onSelect={onSelect}
          isSubmitting={isSubmitting}
          layout="horizontal"
        />

        {/* 非ログイン時のログイン誘導（Q4=B） */}
        {!isLoggedIn && (
          <div
            className="mt-5 p-3 text-center"
            style={{
              background:   'var(--washi-deep)',
              border:       '1px solid var(--line)',
              borderRadius: '4px',
            }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
              <strong>ログイン</strong>すると進捗をクラウドに保存できて、
              <br />
              どのデバイスからでも続きから学べます。
            </p>
            <div className="mt-2 flex gap-2 justify-center flex-wrap">
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-4 text-xs font-semibold"
                style={{
                  minHeight:    '36px',
                  borderRadius: '4px',
                  background:   'var(--shu)',
                  color:        'white',
                }}
              >
                ログイン
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center px-4 text-xs font-semibold"
                style={{
                  minHeight:    '36px',
                  borderRadius: '4px',
                  background:   'white',
                  color:        'var(--sumi)',
                  border:       '1px solid var(--line)',
                }}
              >
                無料登録
              </Link>
            </div>
          </div>
        )}

        {/* 閉じる（送信中以外） */}
        {!isSubmitting && (
          <button
            type="button"
            onClick={onClose}
            className="block mx-auto mt-5 text-xs underline"
            style={{ color: 'var(--sumi-light)' }}
          >
            あとで答える（閉じる）
          </button>
        )}
      </div>
    </div>
  );
}
