'use client';

/**
 * hooks/useScrollReveal.ts
 * familyai.jp — スクロールリビールフック
 *
 * 使い方:
 *   const ref = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className="reveal">...</div>
 *
 * IntersectionObserver で要素が画面に入ったとき `.visible` クラスを付与する。
 * globals.css の `.reveal` / `.reveal.visible` と連動する。
 *
 * options:
 *   threshold  - 何割見えたら発火するか（デフォルト 0.12）
 *   rootMargin - 発火マージン（デフォルト "0px 0px -48px 0px"）
 *   once       - 一度だけ発火するか（デフォルト true）
 */

import { useEffect, useRef } from 'react';

interface UseScrollRevealOptions {
  threshold?:  number;
  rootMargin?: string;
  once?:       boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: UseScrollRevealOptions = {},
) {
  const {
    threshold  = 0.12,
    rootMargin = '0px 0px -48px 0px',
    once       = true,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // prefers-reduced-motion の場合は即座に表示
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.querySelectorAll<HTMLElement>('.reveal').forEach((child) => {
        child.classList.add('visible');
      });
      el.classList.add('visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold, rootMargin },
    );

    // コンテナ自体が .reveal クラスを持つ場合
    if (el.classList.contains('reveal')) {
      observer.observe(el);
    }

    // 子要素の .reveal も監視
    el.querySelectorAll<HTMLElement>('.reveal').forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

/**
 * 複数要素にまとめて適用するバリアント
 * 使い方: const { containerRef } = useScrollRevealContainer();
 *         <section ref={containerRef}>...</section>
 */
export function useScrollRevealContainer(options: UseScrollRevealOptions = {}) {
  const containerRef = useScrollReveal<HTMLElement>(options);
  return { containerRef };
}
