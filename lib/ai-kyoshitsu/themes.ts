/**
 * lib/ai-kyoshitsu/themes.ts
 * うごくAI教室 — テーマデータ（全29テーマ）
 */

export type Grade = 'elem-low' | 'elem-high' | 'middle';
export type Subject = 'science' | 'math' | 'social';

export const GRADE_LABEL: Record<Grade, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};

export const SUBJECT_LABEL: Record<Subject, string> = {
  science: '🔬 理科',
  math:    '🔢 算数・数学',
  social:  '🌏 社会',
};

export const SUBJECT_COLOR: Record<Subject, { bg: string; text: string; border: string }> = {
  science: { bg: '#e3f2fd', text: '#1a5faa', border: '#4e9af1' },
  math:    { bg: '#fff3e0', text: '#bf6000', border: '#f4a261' },
  social:  { bg: '#e8f5e9', text: '#2d6a4f', border: '#52b788' },
};

export type Theme = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  animHint: string;
  grade: Grade;
  subject: Subject;
  /** S3 などにアップロード済みの場合にセット */
  previewUrl?: string;
};

export const THEMES: Theme[] = [
  // ── 理科 / 小3・4年生 ──────────────────────────────
  {
    id: 'sci-shadow',
    icon: '☀️',
    name: '影のでき方・太陽の動き',
    desc: '朝〜夕方で影の長さと向きが変わる',
    animHint: 'スライダーで時刻を操作',
    grade: 'elem-low',
    subject: 'science',
    previewUrl: 'https://my-obsidian-images-860837748789-ap-northeast-1-an.s3.ap-northeast-1.amazonaws.com/familyaijp/sci-shadow.html',
  },
  {
    id: 'sci-magnet',
    icon: '🧲',
    name: '磁石の力',
    desc: '引きつける・しりぞける、磁力線',
    animHint: 'N/S極を動かして確認',
    grade: 'elem-low',
    subject: 'science',
  },
  {
    id: 'sci-plant',
    icon: '🌱',
    name: '植物の発芽と成長',
    desc: '水・空気・温度の条件で変化',
    animHint: '条件ON/OFFで成長比較',
    grade: 'elem-low',
    subject: 'science',
  },
  {
    id: 'sci-weather',
    icon: '🌦️',
    name: '天気の変化',
    desc: '雲の動きと雨・晴れの関係',
    animHint: '天気マップをアニメーション',
    grade: 'elem-low',
    subject: 'science',
  },

  // ── 理科 / 小5・6年生 ──────────────────────────────
  {
    id: 'sci-circuit',
    icon: '💡',
    name: '電気の流れ（回路）',
    desc: '直列・並列、電球の明るさの違い',
    animHint: '回路を組み替えて確認',
    grade: 'elem-high',
    subject: 'science',
  },
  {
    id: 'sci-dissolve',
    icon: '🌊',
    name: 'もののとけ方',
    desc: '温度と溶ける量の関係',
    animHint: '温度スライダーで溶解量変化',
    grade: 'elem-high',
    subject: 'science',
  },
  {
    id: 'sci-moon',
    icon: '🌙',
    name: '月の満ち欠け',
    desc: '太陽・地球・月の位置関係',
    animHint: '月が地球を回るアニメ',
    grade: 'elem-high',
    subject: 'science',
  },
  {
    id: 'sci-lever',
    icon: '⚖️',
    name: 'てこのはたらき',
    desc: '支点・力点・作用点と釣り合い',
    animHint: 'おもりの位置を動かす',
    grade: 'elem-high',
    subject: 'science',
  },
  {
    id: 'sci-water',
    icon: '💧',
    name: '水のすがた（状態変化）',
    desc: '固体・液体・気体と温度の関係',
    animHint: '温度計と分子の動きを図示',
    grade: 'elem-high',
    subject: 'science',
  },

  // ── 理科 / 中学生 ───────────────────────────────────
  {
    id: 'sci-ohm',
    icon: '⚡',
    name: '電流・電圧・抵抗（オームの法則）',
    desc: 'V=IRの関係をグラフで確認',
    animHint: '抵抗値を変えてグラフ変化',
    grade: 'middle',
    subject: 'science',
  },
  {
    id: 'sci-seismic',
    icon: '🌍',
    name: '地震の波（P波・S波）',
    desc: '初期微動・主要動の到着時間差',
    animHint: '震源からの波の広がり',
    grade: 'middle',
    subject: 'science',
  },
  {
    id: 'sci-stars',
    icon: '🔭',
    name: '天体の動き（日周運動）',
    desc: '星・太陽が東から西へ動く理由',
    animHint: '地球の自転と星空の動き',
    grade: 'middle',
    subject: 'science',
  },

  // ── 算数・数学 / 小3・4年生 ───────────────────────────
  {
    id: 'math-fraction',
    icon: '🍕',
    name: '分数のイメージ',
    desc: '1/2・1/4など、図形を分割して理解',
    animHint: '図形をタップで分割',
    grade: 'elem-low',
    subject: 'math',
  },
  {
    id: 'math-angle',
    icon: '📐',
    name: '角度のしくみ',
    desc: '0°〜360°、直角・鈍角・鋭角',
    animHint: 'スライダーで角度を変化',
    grade: 'elem-low',
    subject: 'math',
  },
  {
    id: 'math-area',
    icon: '📏',
    name: '面積の求め方',
    desc: '長方形→三角形→平行四辺形の導出',
    animHint: '図形を変形して面積を確認',
    grade: 'elem-low',
    subject: 'math',
  },

  // ── 算数・数学 / 小5・6年生 ───────────────────────────
  {
    id: 'math-circle',
    icon: '⭕',
    name: '円の面積・円周',
    desc: 'πとはなにか、半径と面積の関係',
    animHint: '半径スライダーで面積変化',
    grade: 'elem-high',
    subject: 'math',
  },
  {
    id: 'math-percent',
    icon: '📊',
    name: '割合・百分率',
    desc: 'もとにする量・比べる量・割合',
    animHint: '棒グラフで割合を視覚化',
    grade: 'elem-high',
    subject: 'math',
  },
  {
    id: 'math-combo',
    icon: '🎲',
    name: '場合の数・並べ方',
    desc: '樹形図で組み合わせを数える',
    animHint: '選択肢を選ぶと樹形図が展開',
    grade: 'elem-high',
    subject: 'math',
  },

  // ── 算数・数学 / 中学生 ───────────────────────────────
  {
    id: 'math-linear',
    icon: '📈',
    name: '一次関数・比例のグラフ',
    desc: '傾きと切片を変えてグラフ確認',
    animHint: 'a・bのスライダーでy=ax+b変化',
    grade: 'middle',
    subject: 'math',
  },
  {
    id: 'math-pythagoras',
    icon: '📐',
    name: '三平方の定理（ピタゴラス）',
    desc: 'a²+b²=c²を図形で直感的に理解',
    animHint: '3辺の正方形を並べて面積確認',
    grade: 'middle',
    subject: 'math',
  },
  {
    id: 'math-transform',
    icon: '🔄',
    name: '図形の変換（回転・対称）',
    desc: '点対称・線対称・回転移動',
    animHint: '図形をドラッグして変換',
    grade: 'middle',
    subject: 'math',
  },

  // ── 社会 / 小3・4年生 ────────────────────────────────
  {
    id: 'soc-map',
    icon: '🗺️',
    name: '地図の読み方',
    desc: '方位・地図記号・縮尺のしくみ',
    animHint: '地図上でクリックして記号確認',
    grade: 'elem-low',
    subject: 'social',
  },
  {
    id: 'soc-factory',
    icon: '🏭',
    name: 'ものができるまで（工場・農業）',
    desc: '原料→加工→出荷の流れ',
    animHint: 'フローチャートをステップで確認',
    grade: 'elem-low',
    subject: 'social',
  },

  // ── 社会 / 小5・6年生 ────────────────────────────────
  {
    id: 'soc-agriculture',
    icon: '🌾',
    name: '日本の農業・食料生産',
    desc: '地域別の産地・食料自給率の変化',
    animHint: '日本地図で産地をクリック',
    grade: 'elem-high',
    subject: 'social',
  },
  {
    id: 'soc-history',
    icon: '🏯',
    name: '歴史の流れ（時代の変化）',
    desc: '縄文〜現代をタイムラインで確認',
    animHint: 'タイムラインをスクロール',
    grade: 'elem-high',
    subject: 'social',
  },
  {
    id: 'soc-world',
    icon: '🌏',
    name: '世界の国々・地理',
    desc: '大陸・海洋・主な国の位置',
    animHint: '世界地図でクリックして国を学ぶ',
    grade: 'elem-high',
    subject: 'social',
  },
  {
    id: 'soc-recycle',
    icon: '♻️',
    name: 'ごみの処理とリサイクル',
    desc: '分別→収集→処理の流れ',
    animHint: 'ごみを分類するインタラクション',
    grade: 'elem-high',
    subject: 'social',
  },

  // ── 社会 / 中学生 ────────────────────────────────────
  {
    id: 'soc-climate',
    icon: '🌐',
    name: '地球の気候区分',
    desc: '熱帯・温帯・寒帯などの分布',
    animHint: '世界地図で気候帯を色分け',
    grade: 'middle',
    subject: 'social',
  },
  {
    id: 'soc-meiji',
    icon: '📜',
    name: '日本の歴史（江戸〜明治）',
    desc: '黒船来航・開国・文明開化の流れ',
    animHint: '年表をクリックして出来事確認',
    grade: 'middle',
    subject: 'social',
  },
];

/** grade × subject でフィルタ */
export function filterThemes(grade: Grade, subject: Subject): Theme[] {
  return THEMES.filter((t) => t.grade === grade && t.subject === subject);
}
