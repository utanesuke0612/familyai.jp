'use client';

import { useEffect, useState } from 'react';

interface LinkPreviewData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string | null;
  hostname: string;
}

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setFailed(false);

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      cache:  'force-cache',
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('preview failed')))
      .then((json: { ok: boolean; data: LinkPreviewData }) => {
        if (json.ok) setData(json.data);
        else setFailed(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [url]);

  if (failed) {
    return (
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      </p>
    );
  }

  if (!data) {
    return <div className="skeleton" style={{ height: '104px', borderRadius: '4px', margin: '1.25rem 0' }} />;
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'grid',
        gridTemplateColumns: data.image ? 'minmax(0,1fr) 120px' : '1fr',
        gap:            '1rem',
        alignItems:     'stretch',
        margin:         '1.25rem 0',
        padding:        '0.875rem',
        border:         '1px solid var(--line)',
        borderRadius:   '4px',
        background:     'rgba(255,255,255,0.86)',
        color:          'var(--sumi)',
        textDecoration: 'none',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span className="font-mincho" style={{ display: 'block', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 }}>
          {data.title || data.hostname}
        </span>
        {data.description && (
          <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--sumi-light)', fontSize: '0.875rem', lineHeight: 1.55 }}>
            {data.description}
          </span>
        )}
        <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--shu)', fontSize: '0.75rem' }}>
          {data.siteName ? `${data.siteName} · ${data.hostname}` : data.hostname}
        </span>
      </span>
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line-soft)' }}
        />
      )}
    </a>
  );
}
