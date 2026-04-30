/**
 * lib/voaenglish/progress-store.ts
 * familyai.jp — 非ログイン時のレッスン進捗を localStorage で簡易保存（R3-機能3 Phase 6）
 *
 * Q4=B 採用: 非ログインでも localStorage にローカル保存し、
 *           「ログインで進捗をクラウド同期できます」と促す。
 *
 * ログイン時は /api/user/lessons-progress に POST するため、
 * このストアは読まれない（将来「ログイン時にローカル → サーバ移行」
 * を実装するなら getLocalProgress / clearLocalProgress を活用）。
 *
 * 形式（JSON.stringify）:
 *   {
 *     "anna/lesson-01": {
 *       status: "completed",
 *       attempts: 3,
 *       completedAt: "2026-04-29T12:00:00.000Z",
 *       updatedAt:   "2026-04-29T12:00:00.000Z"
 *     },
 *     ...
 *   }
 */

const STORAGE_KEY = 'familyai:voa-progress';

export interface LocalLessonProgress {
  status:       'in_progress' | 'completed';
  attempts:     number;
  completedAt?: string;
  updatedAt:    string;
}

type Store = Record<string, LocalLessonProgress>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(data: Store): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceeded / プライベートモード等。サイレントに失敗。
  }
}

/**
 * 進捗を保存する。
 * - action='attempt'  : attempts +1（status は維持）
 * - action='complete' : status='completed', completedAt=now, attempts +1
 */
export function saveLocalProgress(
  lessonKey: string,
  action:    'attempt' | 'complete',
): void {
  const store    = readStore();
  const existing = store[lessonKey] ?? {
    status:    'in_progress' as const,
    attempts:  0,
    updatedAt: '',
  };
  const now = new Date().toISOString();

  if (action === 'complete') {
    store[lessonKey] = {
      status:      'completed',
      attempts:    existing.attempts + 1,
      completedAt: now,
      updatedAt:   now,
    };
  } else {
    store[lessonKey] = {
      ...existing,
      attempts:  existing.attempts + 1,
      updatedAt: now,
    };
  }
  writeStore(store);
}

/** 指定レッスンの進捗を取得。なければ null */
export function getLocalProgress(lessonKey: string): LocalLessonProgress | null {
  const store = readStore();
  return store[lessonKey] ?? null;
}

/** 全進捗をクリア（将来のログイン時 → サーバ移行で使用） */
export function clearLocalProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
