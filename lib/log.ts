/**
 * lib/log.ts
 * familyai.jp — 構造化ロガー（Rev31 / Phase 3 / CX-7）
 *
 * Vercel ログを JSON で検索可能にする軽量ラッパー。
 *   logger.info('ai.chat',   { userId, model, durationMs })
 *   logger.warn('admin.csrf',{ userId, route })
 *   logger.error('db.fail', err, { route })
 *
 * - 出力は 1行 1JSON（Vercel の Logs UI / CLI でクエリ可能）。
 * - 本番／プレビュー では `level >= 'info'`、開発 では `level >= 'debug'`。
 * - PII / スタックトレース漏洩を抑制するため、Error は `message` のみを抽出
 *   （`detail` 経由で stack を渡したい場合は明示的に呼び出し側で含める）。
 *
 * 移行ポリシー:
 *   - 既存 `console.error/warn` を順次置換。
 *   - new code では `logger.*` を必ず使う。
 *   - request scope の相関 ID は呼び出し側で `req.headers.get('x-vercel-id')`
 *     を取得して `meta.requestId` として渡す。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info:  20,
  warn:  30,
  error: 40,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info'
  : process.env.NODE_ENV === 'test'     ? 'warn'
  :                                       'debug';

interface LogMeta {
  /** Vercel Edge / Function 相関 ID — `req.headers.get('x-vercel-id')` */
  requestId?: string;
  /** 呼び出し元ユーザー ID（あれば） */
  userId?:    string;
  /** ルート名 e.g. `/api/admin/articles` */
  route?:     string;
  /** Stage1/Stage2 等の段階名（AI 系） */
  stage?:     string;
  /** 計測値 */
  durationMs?: number;
  /** その他任意フィールド（PII を含めないこと） */
  [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function emit(level: LogLevel, label: string, meta: LogMeta, errMessage?: string): void {
  if (!shouldLog(level)) return;
  const payload = {
    ts:    new Date().toISOString(),
    level,
    label,
    ...(errMessage ? { err: errMessage } : {}),
    ...meta,
  };
  // Vercel の Logs UI は stdout/stderr を JSON として認識する。
  const line = JSON.stringify(payload);
  if (level === 'error' || level === 'warn') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

function safeErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const logger = {
  debug(label: string, meta: LogMeta = {}): void {
    emit('debug', label, meta);
  },
  info(label: string, meta: LogMeta = {}): void {
    emit('info', label, meta);
  },
  warn(label: string, errOrMeta?: unknown, meta: LogMeta = {}): void {
    if (errOrMeta && (errOrMeta instanceof Error || typeof errOrMeta === 'string')) {
      emit('warn', label, meta, safeErrMessage(errOrMeta));
    } else {
      emit('warn', label, (errOrMeta as LogMeta) ?? {});
    }
  },
  error(label: string, errOrMeta?: unknown, meta: LogMeta = {}): void {
    if (errOrMeta && (errOrMeta instanceof Error || typeof errOrMeta === 'string')) {
      emit('error', label, meta, safeErrMessage(errOrMeta));
    } else {
      emit('error', label, (errOrMeta as LogMeta) ?? {});
    }
  },
};

/**
 * Route Handler の冒頭で呼ぶと、相関 ID 付き logger を返す。
 *   const log = withRequest(req, '/api/admin/articles');
 *   log.info('admin.list', { count });
 */
export function withRequest(
  req: Request | { headers: Headers },
  route: string,
): typeof logger {
  const requestId = req.headers.get('x-vercel-id') ?? undefined;
  return {
    debug: (label, meta = {}) => logger.debug(label, { requestId, route, ...meta }),
    info:  (label, meta = {}) => logger.info(label,  { requestId, route, ...meta }),
    warn:  (label, errOrMeta?, meta = {}) =>
      logger.warn(label, errOrMeta, { requestId, route, ...(meta ?? {}) }),
    error: (label, errOrMeta?, meta = {}) =>
      logger.error(label, errOrMeta, { requestId, route, ...(meta ?? {}) }),
  };
}
