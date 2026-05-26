'use client';

import { useEffect, useId, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const uid = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setSvg('');
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
        if (!cancelled) setSvg(result.svg);
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
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="skeleton" style={{ height: '160px', borderRadius: '4px' }} />
      )}
    </div>
  );
}
