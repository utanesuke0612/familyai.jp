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
};

export type Lesson = LessonFrontmatter & {
  body: string;
  filename: string;
};

const CONTENT_DIR = path.join(process.cwd(), 'content', 'voaenglish');

function parseLessonFile(filename: string): Lesson | null {
  const filePath = path.join(CONTENT_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf8');
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
    body:         content.trim(),
    filename,
  };
}

export const getAllLessons = cache((): Lesson[] => {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const lessons = files
    .map(parseLessonFile)
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
