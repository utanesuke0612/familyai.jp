/**
 * lib/voaenglish/lessons.ts
 * familyai.jp — VOA英語学習レッスンのファイルベース読み込み
 *
 * content/voaenglish/*.md を読み取り、frontmatter + 本文を返す。
 * React.cache でモジュール内メモ化（同一ビルド/リクエスト内で再読込を回避）。
 */

import { cache } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type LessonLevel = 'beginning' | 'intermediate' | 'advanced';

export type LessonFrontmatter = {
  slug: string;
  level: LessonLevel;
  course: string;
  courseTitle: string;
  lessonNumber: number | null;
  title: string;
  thumbnail?: string;
  voaUrl?: string;
  published: boolean;
  // R3-機能3（AIctation センテンスプレイヤー）で追加された任意フィールド
  /** ① レッスン概要（日本語）。① 概要セクションで表示される。複数行可（YAML の `|` 記法推奨） */
  description?: string;
  /** ② 会話を聞いて、読んでみよう セクションで使う MP3 ファイル URL（Vercel Blob 等） */
  audioUrl?: string;
  /** ② 会話を聞いて、読んでみよう セクションで使う動画 iframe URL（VOA 公式 embed 等。任意） */
  videoUrl?: string;
};

export type Lesson = LessonFrontmatter & {
  body: string;
  filename: string;
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'voaenglish');

function parseLessonFile(absolutePath: string, relativeFilename: string): Lesson | null {
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const { data, content } = matter(raw);

  if (!data.slug || !data.course || !data.level || !data.title) {
    return null;
  }

  return {
    slug:         String(data.slug),
    level:        data.level as LessonLevel,
    course:       String(data.course),
    courseTitle:  String(data.courseTitle ?? ''),
    lessonNumber: typeof data.lessonNumber === 'number' ? data.lessonNumber : null,
    title:        String(data.title),
    thumbnail:    data.thumbnail ? String(data.thumbnail) : undefined,
    voaUrl:       data.voaUrl ? String(data.voaUrl) : undefined,
    published:    data.published !== false,
    description:  data.description ? String(data.description) : undefined,
    audioUrl:     data.audioUrl   ? String(data.audioUrl)   : undefined,
    videoUrl:     data.videoUrl   ? String(data.videoUrl)   : undefined,
    body:         content.trim(),
    filename:     relativeFilename,
  };
}

/** content/voaenglish 配下を再帰的に走査して .md 絶対パスを集める */
function collectMarkdownFiles(dir: string): Array<{ abs: string; rel: string }> {
  const out: Array<{ abs: string; rel: string }> = [];
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push({ abs, rel: path.relative(CONTENT_DIR, abs) });
      }
    }
  }
  return out;
}

export const getAllLessons = cache((): Lesson[] => {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  // サブディレクトリ（コース別フォルダ）も再帰的に拾う
  const files = collectMarkdownFiles(CONTENT_DIR);
  const lessons = files
    .map(({ abs, rel }) => parseLessonFile(abs, rel))
    .filter((l): l is Lesson => l !== null && l.published);

  lessons.sort((a, b) => {
    if (a.course !== b.course) return a.course.localeCompare(b.course);
    const an = a.lessonNumber ?? 0;
    const bn = b.lessonNumber ?? 0;
    return an - bn;
  });

  return lessons;
});

export const getLessonsByCourse = cache((course: string): Lesson[] => {
  return getAllLessons().filter((l) => l.course === course);
});

export const getLesson = cache((course: string, slug: string): Lesson | null => {
  return getAllLessons().find((l) => l.course === course && l.slug === slug) ?? null;
});

export function getAdjacentLessons(course: string, slug: string): {
  prev: Lesson | null;
  next: Lesson | null;
} {
  const list = getLessonsByCourse(course);
  const idx = list.findIndex((l) => l.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}
