'use client';

/**
 * components/home/RolePicker.tsx
 * familyai.jp — ロール選択UI
 *
 * - 5カラムグリッド（モバイル: 3カラム）
 * - 選択状態で URL クエリパラメータを更新
 * - CategoryFilter と連携
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ROLE_EMOJI, FAMILY_ROLE_LABEL } from '@/shared';
import type { FamilyRole } from '@/shared';

// ── ロール定義 ────────────────────────────────────────────────
const ROLES: { id: FamilyRole; desc: string }[] = [
  { id: 'common', desc: 'みんなで使える' },
  { id: 'papa',   desc: '仕事・副業・学習' },
  { id: 'mama',   desc: '育児・家事・節約' },
  { id: 'kids',   desc: '勉強・工作・遊び' },
  { id: 'senior', desc: '健康・趣味・生活' },
];

export function RolePicker() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const selectedRole = (searchParams.get('role') ?? null) as FamilyRole | null;

  const ref = useScrollReveal<HTMLElement>();

  function handleSelect(role: FamilyRole) {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedRole === role) {
      params.delete('role');          // 同じロールをタップで選択解除
    } else {
      params.set('role', role);
      params.delete('cat');           // ロール変更時はカテゴリをリセット
    }
    router.push(`/learn?${params.toString()}`);
  }

  return (
    <section
      id="role-picker"
      ref={ref}
      className="noise-bg"
      style={{
        background:   'var(--color-beige)',
        paddingBlock: 'var(--section-py)',
      }}
      aria-label="ロール選択"
    >
      <div
        className="max-w-container mx-auto"
        style={{ paddingInline: 'var(--container-px)' }}
      >
        {/* タイトル */}
        <div className="text-center mb-10 reveal">
          <p
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-orange)' }}
          >
            あなたはどなたですか？
          </p>
          <h2
            className="font-display font-bold"
            style={{ fontSize: 'var(--text-title)', color: 'var(--color-brown)' }}
          >
            ロールを選んで<br className="sm:hidden" />はじめよう
          </h2>
        </div>

        {/* ロールグリッド */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {ROLES.map((role, i) => {
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleSelect(role.id)}
                className={`reveal reveal-delay-${i + 1} group flex flex-col items-center gap-2 rounded-2xl py-5 px-3 sm:py-7 sm:px-4 border-3 transition-[transform,box-shadow,border-color] duration-200`}
                style={{
                  background:  'white',
                  border:      `3px solid ${isSelected ? 'var(--color-orange)' : 'transparent'}`,
                  boxShadow:   isSelected
                    ? 'var(--shadow-orange)'
                    : 'var(--shadow-warm-sm)',
                  transform:   isSelected ? 'translateY(-6px)' : 'translateY(0)',
                  outline:     'none',
                }}
                aria-pressed={isSelected}
                aria-label={`${FAMILY_ROLE_LABEL[role.id]}向けを選択`}
              >
                <span
                  className="text-4xl sm:text-5xl transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {ROLE_EMOJI[role.id]}
                </span>
                <span
                  className="font-bold text-sm sm:text-base"
                  style={{ color: isSelected ? 'var(--color-orange)' : 'var(--color-brown)' }}
                >
                  {FAMILY_ROLE_LABEL[role.id]}
                </span>
                <span
                  className="text-xs text-center leading-tight hidden sm:block"
                  style={{ color: 'var(--color-brown-light)' }}
                >
                  {role.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* 選択中のロールの説明 */}
        {selectedRole && (
          <p
            className="text-center text-sm animate-fade-in-up"
            style={{ color: 'var(--color-brown-light)' }}
          >
            <span style={{ color: 'var(--color-orange)', fontWeight: 700 }}>
              {FAMILY_ROLE_LABEL[selectedRole]}向け
            </span>
            のコンテンツを表示中 —{' '}
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('role');
                params.delete('cat');
                router.push(`/learn?${params.toString()}`);
              }}
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-brown-light)' }}
            >
              すべて表示
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
