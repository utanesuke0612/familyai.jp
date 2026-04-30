'use client';

/**
 * components/voaenglish/DictationPanel.tsx
 * familyai.jp — Dictation 練習セクションのオーケストレーター（R3-機能3 Phase 6）
 *
 * 役割:
 *   - HandwritingNote / SentencePlayer / CompletionDialog / NextLessonCta を統合
 *   - 全再生終了 → ダイアログ自動表示（Q5=C）
 *   - 自己申告 → API or localStorage 保存（Q4=B）
 *   - 🌟 → confetti 演出 + NextLessonCta 表示
 *
 * 状態管理:
 *   - showDialog : ダイアログ表示制御
 *   - completed  : 🌟 が押されたか（NextLessonCta 表示判定）
 *   - isSubmitting: API リクエスト中
 *
 * Server Component から渡されるべき props:
 *   - lessonKey: "anna/lesson-01"
 *   - audioUrl, sentences, lessonTitle
 *   - nextLesson（次のレッスン情報・任意）
 */

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Sentence } from '@/shared/types';
import { saveLocalProgress } from '@/lib/voaenglish/progress-store';
import { HandwritingNote }   from './HandwritingNote';
import { SentencePlayer }    from './SentencePlayer';
import { CompletionDialog }  from './CompletionDialog';
import { NextLessonCta, type NextLessonInfo } from './NextLessonCta';
import type { SelfReportAction } from './SelfReport';

interface DictationPanelProps {
  lessonKey:    string;
  lessonTitle:  string;
  audioUrl:     string;
  sentences:    readonly Sentence[];
  nextLesson:   NextLessonInfo | null;
}

export function DictationPanel({
  lessonKey,
  lessonTitle,
  audioUrl,
  sentences,
  nextLesson,
}: DictationPanelProps) {
  const [showDialog,   setShowDialog]   = useState(false);
  const [completed,    setCompleted]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.id;

  // 全再生完了 → モーダル表示
  const handleAllPlayed = useCallback(() => {
    setShowDialog(true);
  }, []);

  // 自己申告 → 進捗保存 + 演出
  const handleSelfReport = useCallback(
    async (action: SelfReportAction) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      // API/ローカルへ保存
      const apiAction: 'attempt' | 'complete' =
        action === 'perfect' ? 'complete' : 'attempt';

      try {
        if (isLoggedIn) {
          // ログイン: API へ POST
          const res = await fetch('/api/user/lessons-progress', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ lessonKey, action: apiAction }),
          });
          if (!res.ok) {
            console.warn(
              '[DictationPanel] API failed, falling back to localStorage',
              res.status,
            );
            saveLocalProgress(lessonKey, apiAction);
          }
        } else {
          // 非ログイン: localStorage へ保存（Q4=B）
          saveLocalProgress(lessonKey, apiAction);
        }
      } catch (err) {
        console.warn('[DictationPanel] save failed', err);
        // フォールバック: localStorage に救済保存
        saveLocalProgress(lessonKey, apiAction);
      }

      // モーダル閉じる
      setShowDialog(false);
      setIsSubmitting(false);

      // 🌟 完璧時の演出（Q3=A）
      if (action === 'perfect') {
        setCompleted(true);
        // 動的 import でバンドルサイズを最小化
        try {
          const { default: confetti } = await import('canvas-confetti');
          confetti({
            particleCount: 120,
            spread:        80,
            origin:        { y: 0.6 },
            zIndex:        9999,
          });
          // 0.5s 後にもう一発（演出強化）
          setTimeout(() => {
            confetti({
              particleCount: 60,
              spread:        100,
              origin:        { y: 0.5, x: 0.3 },
              zIndex:        9999,
            });
            confetti({
              particleCount: 60,
              spread:        100,
              origin:        { y: 0.5, x: 0.7 },
              zIndex:        9999,
            });
          }, 500);
        } catch (err) {
          console.warn('[DictationPanel] confetti failed', err);
        }
      }
    },
    [isLoggedIn, isSubmitting, lessonKey],
  );

  return (
    <>
      <HandwritingNote />
      <SentencePlayer
        audioUrl={audioUrl}
        sentences={sentences}
        onAllPlayed={handleAllPlayed}
      />

      {/* 自己申告ダイアログ */}
      {showDialog && (
        <CompletionDialog
          isLoggedIn={isLoggedIn}
          isSubmitting={isSubmitting}
          lessonTitle={lessonTitle}
          onSelect={handleSelfReport}
          onClose={() => !isSubmitting && setShowDialog(false)}
        />
      )}

      {/* 🌟 完璧時の次レッスン CTA */}
      {completed && (
        <NextLessonCta next={nextLesson} />
      )}
    </>
  );
}
