/**
 * components/tools/3d-tutor/HotspotPanel.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * 3D モデルでホットスポットがタップされた時に下から立ち上がるパネル。
 * - 既定説明文を表示
 * - 「あいちゃんに もっと聞く」で既存 /api/ai に投げて深掘り解説
 * - 子モード（やさしい言葉）と大人モード（くわしい説明）の 2 段階トグル
 *
 * 既存 AIChatWidget の SSE ストリーミング呼び出しパターンを踏襲。
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Tutor3dHotspot, Tutor3dModel } from '@/shared';

type Mode = 'kid' | 'parent';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HotspotPanelProps {
  model:   Tutor3dModel;
  hotspot: Tutor3dHotspot | null;
  onClose: () => void;
}

export function HotspotPanel({ model, hotspot, onClose }: HotspotPanelProps) {
  const [mode,      setMode]      = useState<Mode>('kid');
  const [messages,  setMessages]  = useState<AiMessage[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [streaming, setStreaming] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // hotspot が切り替わったら会話をリセット
  useEffect(() => {
    setMessages([]);
    setStreaming('');
    abortRef.current?.abort();
  }, [hotspot?.id]);

  if (!hotspot) return null;

  async function askAi() {
    if (!hotspot) return;
    if (loading) return;

    setLoading(true);
    setStreaming('');

    // 既存 /api/ai の messages 形式
    const systemPrompt = [
      `あなたは familyai.jp の AI チューター「あいちゃん」です。`,
      `子ども向け教育サイトで、3D の「${model.title}」を一緒に観察しています。`,
      `モデルの説明: ${model.description || '（説明なし）'}`,
      `今ユーザーがタップしたパーツ: ${hotspot.partName}`,
      hotspot.promptHint ? `背景情報: ${hotspot.promptHint}` : '',
      mode === 'kid'
        ? '5〜10歳の子どもに話すように、やさしい言葉で 2〜3 文で答えてください。怖い表現は避けてください。'
        : '大人向けに正確な学術用語を使い、4〜6 文で答えてください。',
    ].filter(Boolean).join('\n');

    const userPrompt = `「${hotspot.partName}」について、もう少しくわしく教えて。`;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text-simple',
          messages: [
            { role: 'system',    content: systemPrompt },
            { role: 'user',      content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setStreaming('AI からの応答を取得できませんでした。少し待ってからもう一度お試しください。');
        setLoading(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 形式: "data: {...}\n\n" を 1 行ずつ処理
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') break;
          try {
            const obj = JSON.parse(payload) as { delta?: string };
            if (obj.delta) {
              acc += obj.delta;
              setStreaming(acc);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user',      content: userPrompt },
        { role: 'assistant', content: acc },
      ]);
      setStreaming('');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[HotspotPanel] AI 呼び出しエラー:', err);
        setStreaming('通信エラーが発生しました。');
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="hotspot-panel-title"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: '0 -8px 32px rgba(107, 79, 58, 0.18)',
        padding: '20px 20px 28px',
        maxHeight: '60vh',
        overflowY: 'auto',
        zIndex: 50,
        animation: 'fadeUp 0.25s ease-out',
      }}
    >
      {/* ハンドル */}
      <div
        style={{
          width: 40,
          height: 4,
          borderRadius: 2,
          background: 'var(--color-beige-dark, #D9C7A8)',
          margin: '0 auto 16px',
        }}
        aria-hidden
      />

      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }} aria-hidden>🐰</span>
        <div style={{ flex: 1 }}>
          <h3
            id="hotspot-panel-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-brown, #6B4F3A)' }}
          >
            {hotspot.partName}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-brown-muted, #A48B72)' }}>
            あいちゃんが おしえてくれるよ
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="パネルを閉じる"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--color-cream, #FDF6ED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: 'var(--color-brown, #6B4F3A)',
          }}
        >
          ✕
        </button>
      </div>

      {/* モードトグル */}
      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          role="tab"
          aria-selected={mode === 'kid'}
          onClick={() => setMode('kid')}
          style={tabStyle(mode === 'kid')}
        >
          🧒 こども
        </button>
        <button
          role="tab"
          aria-selected={mode === 'parent'}
          onClick={() => setMode('parent')}
          style={tabStyle(mode === 'parent')}
        >
          👨‍👩‍👧 おとな
        </button>
      </div>

      {/* 既定説明 */}
      {hotspot.defaultExplanation && (
        <div
          style={{
            padding: 14,
            background: 'var(--color-peach-light, #FFEBD8)',
            borderRadius: 14,
            marginBottom: 12,
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--color-brown, #6B4F3A)',
          }}
        >
          {hotspot.defaultExplanation}
        </div>
      )}

      {/* AI 会話履歴 */}
      {messages.map((m, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 16,
              fontSize: 14,
              lineHeight: 1.6,
              background: m.role === 'user'
                ? 'var(--color-orange, #F39C5F)'
                : 'var(--color-cream, #FDF6ED)',
              color: m.role === 'user' ? '#fff' : 'var(--color-brown, #6B4F3A)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        </div>
      ))}

      {/* ストリーミング中 */}
      {streaming && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 16,
            background: 'var(--color-cream, #FDF6ED)',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 10,
            whiteSpace: 'pre-wrap',
            color: 'var(--color-brown, #6B4F3A)',
          }}
        >
          {streaming}
          <span className="ai-cursor" aria-hidden> ▍</span>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={askAi}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          borderRadius: 999,
          background: loading ? 'var(--color-beige-dark, #D9C7A8)' : 'var(--color-orange, #F39C5F)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          cursor: loading ? 'not-allowed' : 'pointer',
          minHeight: 48,
          marginTop: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}
      >
        {loading ? '💭 あいちゃんが考えているよ…' : '💬 あいちゃんに もっと聞く'}
      </button>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 999,
    border: active ? '2px solid var(--color-orange, #F39C5F)' : '2px solid var(--color-beige-dark, #D9C7A8)',
    background: active ? 'var(--color-orange, #F39C5F)' : '#fff',
    color: active ? '#fff' : 'var(--color-brown, #6B4F3A)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    minHeight: 40,
  };
}
