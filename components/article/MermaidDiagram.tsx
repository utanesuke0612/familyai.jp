'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

// Mermaid の initialize() は一度だけ呼ぶ（複数回呼ぶと v11 で不安定になる）
let mermaidInitialized = false;

function formatMermaidError(error: string): string {
  if (/syntax error/i.test(error) || /parse error/i.test(error)) {
    return 'Mermaid 図の文法を確認してください。プレビューでは図にできない Mermaid ブロックがあります。';
  }
  return 'Mermaid 図を表示できませんでした。';
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const uid = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const svgWrapperRef = useRef<HTMLDivElement | null>(null);

  // Mermaid をレンダーして SVG 文字列を取得する
  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setSvg('');

      // Mermaid 用の一時コンテナを自前で管理する。
      // 第3引数に渡すことで Mermaid が document.body に直接 div を追加するのを防ぐ。
      const container = document.createElement('div');
      container.style.cssText =
        'position:absolute;left:-99999px;top:0;width:1200px;pointer-events:none;opacity:0';
      document.body.appendChild(container);

      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'base',
            themeVariables: {
              primaryColor: '#FBF5E8',
              primaryTextColor: '#2A1A12',
              primaryBorderColor: '#D7C6AA',
              lineColor: '#8C5A3C',
              secondaryColor: '#F5EDDE',
              tertiaryColor: '#FFFFFF',
              fontFamily: 'sans-serif',
            },
          });
          mermaidInitialized = true;
        }

        const result = await mermaid.render(`mermaid-${uid}`, chart, container);
        if (cancelled) return;
        setSvg(result.svg);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid diagram could not be rendered.');
        }
      } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart, uid]);

  // SVG が DOM に挿入されたあと、ライブ DOM 上で実コンテンツの bbox を測定し
  // viewBox / width / height を書き換える。
  // 隠しコンテナでの getBBox は妙な値を返すため、ライブ DOM で測るのが確実。
  useEffect(() => {
    if (!svg) return;
    const wrapper = svgWrapperRef.current;
    if (!wrapper) return;
    const svgEl = wrapper.querySelector('svg');
    if (!svgEl) return;

    // SVG をコンテナ追従にする
    svgEl.setAttribute('width', '100%');
    svgEl.removeAttribute('height');
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';

    // 実コンテンツが入っている <g> の bbox で viewBox をタイトに上書き
    const contentGroup = svgEl.querySelector(':scope > g');
    if (contentGroup) {
      try {
        const bbox = (contentGroup as SVGGraphicsElement).getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          const pad = 12;
          const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`;
          svgEl.setAttribute('viewBox', vb);
        }
      } catch {
        // getBBox は非表示要素では失敗する場合がある
      }
    }
  }, [svg]);

  return (
    <div
      style={{
        margin:       '1.5rem 0',
        padding:      '1rem',
        border:       '1px solid var(--line)',
        borderRadius: '4px',
        background:   'white',
        overflowX:    'auto',
      }}
    >
      {error ? (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#B91C1C', fontSize: '13px' }}>
          {formatMermaidError(error)}{'\n\n'}{chart}
        </pre>
      ) : svg ? (
        <div
          ref={svgWrapperRef}
          style={{
            width:        'min(70%, 504px)',
            maxWidth:     '100%',
            marginInline: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="skeleton" style={{ height: '160px', borderRadius: '4px' }} />
      )}
    </div>
  );
}
