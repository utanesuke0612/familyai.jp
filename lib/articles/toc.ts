export interface ArticleTocItem {
  id:    string;
  level: 1 | 2;
  title: string;
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function slugBase(value: string): string {
  const slug = value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'section';
}

function uniqueId(title: string, used: Map<string, number>): string {
  const base = slugBase(title);
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

export function collectArticleHeadings(markdown: string): ArticleTocItem[] {
  const used = new Map<string, number>();
  const items: ArticleTocItem[] = [];
  let inFence = false;
  let fenceMarker: '```' | '~~~' | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^(```|~~~)/)?.[1] as '```' | '~~~' | undefined;
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence;
      } else if (fenceMarker === fence) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }

    if (inFence) continue;

    const match = line.match(/^ {0,3}(#{1,2})(?!#)\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const title = stripInlineMarkdown(match[2] ?? '');
    if (!title) continue;

    items.push({
      id:    uniqueId(title, used),
      level: match[1]!.length as 1 | 2,
      title,
    });
  }

  return items;
}
