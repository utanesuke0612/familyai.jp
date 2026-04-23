'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface TtsPreviewPlayerProps {
  markdown: string;
}

function extractEnglishScript(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^#{1,6}\s+/, '').trim())
    .filter((line) => /[A-Za-z]/.test(line))
    .filter((line) => !/^<iframe\b/i.test(line))
    .filter((line) => line.length >= 12);

  const script = candidates
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 1200)
    .trim();

  return script;
}

export function TtsPreviewPlayer({ markdown }: TtsPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const script = useMemo(() => extractEnglishScript(markdown), [markdown]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  if (!script) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          voice: 'coral',
          format: 'mp3',
          speed: 1,
        }),
      });

      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const data = await res.json() as { error?: { message?: string } };
          message = data.error?.message ?? message;
        } catch {
          // noop
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAudioUrl(url);

      requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => {
          // noop
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声生成に失敗しました。';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        background: 'white',
        borderColor: 'var(--color-beige-dark)',
        boxShadow: 'var(--shadow-warm-sm)',
        marginBottom: '1.5rem',
      }}
    >
      <div className="flex flex-col gap-3">
        <div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--color-orange)' }}
          >
            AI English Audio
          </p>
          <h2
            className="font-display font-bold text-lg"
            style={{ color: 'var(--color-brown)' }}
          >
            記事内の英語フレーズを AI 音声で再生
          </h2>
          <p
            className="text-sm mt-2"
            style={{ color: 'var(--color-brown-light)' }}
          >
            記事内の英語部分を抽出して、OpenRouter 経由の TTS で読み上げます。
          </p>
        </div>

        <div
          className="rounded-xl p-3 text-sm leading-relaxed"
          style={{
            background: 'var(--color-cream)',
            color: 'var(--color-brown)',
            border: '1px solid var(--color-beige)',
          }}
        >
          {script}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: 'var(--color-orange)',
              color: 'white',
              minHeight: '44px',
            }}
          >
            {isLoading ? '音声生成中…' : audioUrl ? '再生成する' : '英語音声を生成'}
          </button>

          {audioUrl && (
            <audio
              ref={audioRef}
              controls
              src={audioUrl}
              className="max-w-full"
            />
          )}
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#B42318' }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
