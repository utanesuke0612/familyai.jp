'use client';

import { useEffect, useId, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const uid = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [diagramWidth, setDiagramWidth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setSvg('');
      setDiagramWidth(null);
      try {
        const mermaid = (await import('mermaid')).default;
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
        const result = await mermaid.render(`mermaid-${uid}`, chart);
        if (cancelled) return;

        // Mermaid v11 sometimes generates an oversized viewBox that doesn't match
        // the actual diagram content. Fix it by inserting the SVG temporarily into
        // the DOM, reading the real getBBox(), and updating viewBox to fit tightly.
        let finalSvg = result.svg;
        let measuredWidth: number | null = null;
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:-9999px';
        tempDiv.innerHTML = result.svg;
        document.body.appendChild(tempDiv);
        try {
          const svgEl = tempDiv.querySelector('svg');
          if (svgEl) {
            const bbox = svgEl.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
              const pad = 12;
              const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`;
              measuredWidth = Math.ceil(bbox.width + pad * 2);
              finalSvg = result.svg
                .replace(/viewBox="[^"]*"/, `viewBox="${vb}"`)
                .replace(/\swidth="[^"]*"/, ' width="100%"')
                .replace(/\sheight="[^"]*"/, ' height="auto"')
                .replace(/style="max-width:[^"]*"/, 'style="max-width:100%;height:auto"');
            }
          }
        } finally {
          document.body.removeChild(tempDiv);
        }

        if (!cancelled) {
          setDiagramWidth(measuredWidth);
          setSvg(finalSvg);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Mermaid diagram could not be rendered.');
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart, uid]);

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
          {error}\n\n{chart}
        </pre>
      ) : svg ? (
        <div
          style={{
            width:        diagramWidth ? `min(100%, ${Math.min(diagramWidth, 720)}px)` : 'min(100%, 720px)',
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
