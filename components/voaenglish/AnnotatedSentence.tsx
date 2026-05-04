'use client';

/**
 * components/voaenglish/AnnotatedSentence.tsx
 * AIctation センテンス本文を注釈付き単語にレンダリング。
 *
 * - `{word|meaning|pron|example}` 構文を AnnotatedWord にマッピング
 * - 注釈なしの平文はそのまま表示（後方互換）
 *
 * speaker prefix の処理は呼び出し側（SentenceList の splitSpeaker）で済んでいる前提。
 * 本コンポーネントには「テキスト本文」だけ渡すこと。
 */

import { Fragment } from 'react';
import { parseAnnotated } from '@/lib/annotations/parse-annotated';
import { AnnotatedWord }  from '@/components/article/AnnotatedWord';

interface AnnotatedSentenceProps {
  text: string;
}

export function AnnotatedSentence({ text }: AnnotatedSentenceProps) {
  const parts = parseAnnotated(text);
  if (parts.length === 1 && parts[0].kind === 'text') {
    // 注釈なし: そのまま返す（パフォーマンス最適化・余分な span を作らない）
    return <>{parts[0].text}</>;
  }
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.kind === 'text'
            ? p.text
            : <AnnotatedWord
                word={p.word}
                meaning={p.meaning}
                pron={p.pron}
                example={p.example}
              />}
        </Fragment>
      ))}
    </>
  );
}
