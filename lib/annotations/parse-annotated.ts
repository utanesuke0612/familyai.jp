/**
 * lib/annotations/parse-annotated.ts
 * 単語ツールチップ構文 `{word|meaning|pron?|example?}` のパーサ。
 *
 * 使用箇所:
 *   - components/article/ArticleBody.tsx       — 記事本文
 *   - components/voaenglish/AnnotatedSentence.tsx — VOA AIctation センテンス
 *
 * 設計原則:
 *   - 後方互換: 注釈なしの平文はそのまま 1 個の TextPart として返る
 *   - 注釈は 2〜4 フィールド（word + meaning は必須、pron / example は任意）
 *   - 文字 `|` `{` `}` `\n` は各フィールド内に含められない
 *     （含めたい場合は将来 JSON 形式に拡張する）
 */

/** 単語ツールチップ構文 `{word|meaning|pron?|example?}` */
export const ANNOTATE_REGEX =
  /\{([^|{}\n]+)\|([^|{}\n]+)(?:\|([^|{}\n]*))?(?:\|([^{}\n]*))?\}/g;

/** パース結果: 平文または注釈付き単語のいずれか */
export type AnnotatedPart =
  | { kind: 'text';     text: string }
  | { kind: 'word';     word: string; meaning: string; pron?: string; example?: string };

/**
 * 文字列を {text or word} の配列に分解する。
 * 注釈が無い場合は単一の text Part を含む配列を返す。
 *
 * テスト容易な純粋関数（副作用なし・React 非依存）。
 */
export function parseAnnotated(input: string): AnnotatedPart[] {
  if (!input || !input.includes('{')) return [{ kind: 'text', text: input }];

  // RegExp は state を持つので毎回 lastIndex リセット
  const re = new RegExp(ANNOTATE_REGEX.source, 'g');
  const out: AnnotatedPart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: input.slice(last, m.index) });
    const [, word, meaning, pron, example] = m;
    out.push({
      kind:    'word',
      word:    word.trim(),
      meaning: meaning.trim(),
      pron:    pron?.trim() || undefined,
      example: example?.trim() || undefined,
    });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ kind: 'text', text: input.slice(last) });
  return out;
}
