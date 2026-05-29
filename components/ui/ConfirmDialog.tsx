/**
 * components/ui/ConfirmDialog.tsx
 * familyai.jp — 共通確認ダイアログ（Rev31 / Phase 4 / CX-3）
 *
 * `window.confirm()` を置き換える a11y 対応モーダル。
 *
 * ✅ 仕様
 * - `role="dialog"` / `aria-modal="true"` / `aria-labelledby` / `aria-describedby`
 * - 開いたら確認ボタンへ自動フォーカス、Escape / 背景クリック / Cancel で閉じる
 * - フォーカストラップ（Tab で内部のみ巡回）
 * - 閉じた後、開いた要素にフォーカスを戻す
 * - シニアロール (Rev28) の `--font-scale` を尊重するため CSS 変数で文字サイズ指定
 *
 * 使い方:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: '記事を削除しますか？',
 *     description: '「タイトル」を完全に削除します。元に戻せません。',
 *     confirmLabel: '削除する',
 *     destructive: true,
 *   });
 *   if (ok) { ... }
 *
 *   <ConfirmDialogHost />  // Provider 直下に1つ配置（layout.tsx 等）
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ────────────────────────────────────────────────────────────────
// types
// ────────────────────────────────────────────────────────────────
export interface ConfirmOptions {
  title:        string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?:  string;
  /** true なら確認ボタンを赤系（危険操作）で描画 */
  destructive?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ConfirmContextValue {
  request: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ────────────────────────────────────────────────────────────────
// Provider — layout.tsx の中で <ConfirmProvider><ConfirmDialogHost /></ConfirmProvider>
// ────────────────────────────────────────────────────────────────
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  const request = useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      }),
    [],
  );

  const close = useCallback((ok: boolean) => {
    if (pending) {
      pending.resolve(ok);
      setPending(null);
    }
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ request }}>
      {children}
      {pending && <ConfirmDialog options={pending} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Provider 未設置時のフォールバック（最低限 window.confirm に委譲）
    // eslint-disable-next-line no-console
    console.warn('[useConfirm] ConfirmProvider が未設置のため window.confirm にフォールバック');
    return async (opts) =>
      typeof window !== 'undefined'
        ? window.confirm(`${opts.title}\n\n${opts.description ?? ''}`)
        : false;
  }
  return ctx.request;
}

// ────────────────────────────────────────────────────────────────
// Dialog 本体
// ────────────────────────────────────────────────────────────────
function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmRequest;
  onClose: (ok: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const confirmRef   = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // 初期フォーカス + 復帰
  useEffect(() => {
    previouslyFocused.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    confirmRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Escape で cancel、Tab でフォーカストラップ
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
        return;
      }
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleId = 'confirm-dialog-title';
  const descId  = 'confirm-dialog-desc';

  return (
    <div
      role="presentation"
      onClick={() => onClose(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'cd-fade 120ms ease-out',
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          fontSize: 'calc(15px * var(--font-scale, 1))',
          color: 'var(--color-brown, #4a2e1f)',
        }}
      >
        <h2
          id={titleId}
          style={{
            fontSize: 'calc(18px * var(--font-scale, 1))',
            fontWeight: 700,
            marginBottom: options.description ? '8px' : '20px',
          }}
        >
          {options.title}
        </h2>
        {options.description && (
          <p id={descId} style={{ marginBottom: '20px', lineHeight: 1.6 }}>
            {options.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onClose(false)}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1px solid #E5E7EB',
              background: 'white',
              color: '#374151',
              fontSize: 'inherit',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {options.cancelLabel ?? 'キャンセル'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: 'none',
              background: options.destructive ? '#DC2626' : 'var(--terracotta)',
              color: 'white',
              fontSize: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {options.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes cd-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
