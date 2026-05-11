/**
 * scripts/seed-3d-models.ts
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * 厳選 3 モデルを `tutor3d_models` テーブルに upsert する。
 *
 * 実行:
 *   pnpm tsx scripts/seed-3d-models.ts
 *
 * 前提:
 *   - drizzle/0018_tutor3d_models.sql 適用済み（pnpm db:push 等で反映）
 *   - public/3d-models/ に GLB ファイル配置済み
 *     （solar-system.glb は scripts/3d-tools/output/ から既にコピー済）
 *     （dna-helix.glb / pendulum.glb は junli さんが追加生成後にコピー）
 */

import { config } from 'dotenv';
// `.env.local` を最優先で読み込む（既存 lib/db/seed.ts と同じパターン）
config({ path: '.env.local' });

import { db } from '../lib/db';
import { tutor3dModels } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Tutor3dHotspot } from '../shared';

interface SeedModel {
  slug:         string;
  title:        string;
  description:  string;
  subject:      'biology' | 'chemistry' | 'earth-space' | 'physics';
  grade:        'elem-low' | 'elem-high' | 'middle';
  glbUrl:       string;
  usdzUrl:      string | null;
  thumbnailUrl: string | null;
  hotspots:     Tutor3dHotspot[];
  attribution:  string;
  license:      string;
  sourceUrl:    string | null;
  published:    boolean;
  isFeatured:   boolean;
}

const MODELS: SeedModel[] = [
  {
    slug:        'solar-system',
    title:       '太陽系',
    description: '太陽と 8 つの惑星が広がる宇宙を、回しながら観察しよう。それぞれの惑星をタップすると、AI が詳しく教えてくれるよ。',
    subject:     'earth-space',
    grade:       'elem-high',
    glbUrl:      '/3d-models/solar-system.glb',
    usdzUrl:     null,
    thumbnailUrl: null,
    hotspots: [
      // meshName: generate-solar-system.py のマテリアル名「<Planet>_Material」と一致。
      // クリック時は ModelViewer の案 ③ ロジックが優先的にこれで判定する。
      // 位置近似フォールバックも残すため position は引き続き保持。
      // 全 9 天体登録（太陽 + 水星〜海王星）：マテリアル名識別なら誤検知ゼロ。
      {
        id:                 'sun',
        partName:           '太陽',
        meshName:           'Sun',
        position:           [0, 0, 0],
        defaultExplanation: 'たいようは、太陽系の中心で自分で光をだしているよ。地球より100倍以上も大きいんだ。',
        promptHint:         '太陽は太陽系の質量の99.8%を占める恒星。水素の核融合反応で光と熱を発する。表面温度約6,000℃、中心温度約1,500万℃。',
      },
      {
        id:                 'mercury',
        partName:           '水星',
        meshName:           'Mercury',
        position:           [1.8, 0, 0],
        defaultExplanation: '太陽に一番近い惑星。とっても小さくて、月よりちょっと大きいくらいだよ。',
        promptHint:         '太陽系最内側の惑星。直径約4,879km（地球の38%）。大気がほぼ無く、昼夜の温度差は約600℃。公転周期88日。',
      },
      {
        id:                 'venus',
        partName:           '金星',
        meshName:           'Venus',
        position:           [2.4, 0, 0],
        defaultExplanation: '地球の「お姉さん星」と呼ばれる金星。雲がぶ厚くて、表面はとっても熱いんだ。',
        promptHint:         '太陽系第2惑星。サイズと質量は地球に近い「双子の惑星」。CO2 主体の温室効果で表面温度は約 460℃。自転は地球と逆向き。',
      },
      {
        id:                 'earth',
        partName:           '地球',
        meshName:           'Earth',
        position:           [3.0, 0, 0],
        defaultExplanation: 'わたしたちが住んでいる星！太陽の周りを365日かけて1まわりするよ。',
        promptHint:         '太陽系の第3惑星。生命が確認されている唯一の天体。公転周期約365.25日、自転周期約24時間。月という衛星を1つ持つ。',
      },
      {
        id:                 'mars',
        partName:           '火星',
        meshName:           'Mars',
        position:           [3.6, 0, 0],
        defaultExplanation: '赤く見える「赤い惑星」。火星にも水の跡があって、地球の次に住めるかもと言われているんだ。',
        promptHint:         '太陽系第4惑星。表面の酸化鉄により赤く見える。自転周期24時間37分（地球とほぼ同じ）。極冠に氷あり。火星探査ローバーが多数着陸済み。',
      },
      {
        id:                 'jupiter',
        partName:           '木星',
        meshName:           'Jupiter',
        position:           [4.8, 0, 0],
        defaultExplanation: '太陽系で一番大きい惑星！しま模様と「大赤斑」という大きな台風が見えるんだ。',
        promptHint:         '太陽系最大の惑星。質量は地球の約318倍、直径は約11倍。ガス状惑星で岩石の表面はない。大赤斑は数百年続く巨大な嵐。',
      },
      {
        id:                 'saturn',
        partName:           '土星',
        meshName:           'Saturn',
        position:           [6.0, 0, 0],
        defaultExplanation: 'きれいな輪っかが特徴の惑星！その輪は氷や岩のかたまりでできているよ。',
        promptHint:         '太陽系第6惑星。明るく見える環は氷と岩の粒で構成。密度が水より低く、もし巨大なプールに入れたら浮く（理論上）。',
      },
      {
        id:                 'uranus',
        partName:           '天王星',
        meshName:           'Uranus',
        position:           [7.0, 0, 0],
        defaultExplanation: '横向きにごろんと転がって自転するちょっと変わった惑星。きれいな水色なんだ。',
        promptHint:         '太陽系第7惑星。自転軸が公転面に対し約98°傾いた特異な天体。大気中のメタンが赤い光を吸収し青緑色に見える。輪も持つが薄い。',
      },
      {
        id:                 'neptune',
        partName:           '海王星',
        meshName:           'Neptune',
        position:           [7.8, 0, 0],
        defaultExplanation: '太陽系で一番遠い惑星！深い青色で、強い風が吹きあれているんだよ。',
        promptHint:         '太陽系最外側の主要惑星。表面風速は秒速 600m に達する。直径は地球の約4倍。1846 年に数学的予測で発見された初の惑星。',
      },
    ],
    attribution: 'AI Coding Agent 生成（Blender Python・generate-solar-system.py）',
    license:     'CC0 (familyai.jp 専用・完全オリジナル)',
    sourceUrl:   null,
    published:   true,
    isFeatured:  true,
  },
  {
    slug:        'dna-helix',
    title:       'DNA 二重らせん',
    description: '生き物の体を作る設計図、DNA。2 本のらせんが向かい合って巻きついている、ふしぎな構造を観察してみよう。',
    subject:     'chemistry',
    grade:       'middle',
    glbUrl:      '/3d-models/dna-helix.glb',
    usdzUrl:     null,
    thumbnailUrl: null,
    hotspots: [
      {
        id:                 'backbone',
        partName:           '糖リン酸骨格',
        position:           [0.6, 0, 0],
        defaultExplanation: 'らせんの「うで」の部分。糖（とう）とリンが交互につながってできているよ。',
        promptHint:         '糖リン酸骨格はデオキシリボース（5炭糖）とリン酸基がホスホジエステル結合で交互に連結した構造。塩基はここから内側に向いて結合。',
      },
      {
        id:                 'base-pair',
        partName:           '塩基対',
        position:           [0, 0, 0],
        defaultExplanation: '色のついたつなぎ目！A-T と G-C のペアで、生き物のせっけい図を書いているよ。',
        promptHint:         'A-T / G-C の相補的塩基対。それぞれ2本・3本の水素結合で結合。塩基配列が遺伝情報をコードする。',
      },
    ],
    attribution: 'AI Coding Agent 生成（Blender Python・generate-dna-helix.py）',
    license:     'CC0 (familyai.jp 専用・完全オリジナル)',
    sourceUrl:   null,
    published:   true,
    isFeatured:  false,
  },
  {
    slug:        'pendulum',
    title:       '振り子の運動',
    description: 'おもりが前後にゆれる、シンプルな仕組み。なぜ同じリズムでゆれ続けるんだろう？',
    subject:     'physics',
    grade:       'elem-high',
    glbUrl:      '/3d-models/pendulum.glb',
    usdzUrl:     null,
    thumbnailUrl: null,
    hotspots: [
      {
        id:                 'bob',
        partName:           'おもり',
        position:           [0, -2, 0],
        defaultExplanation: '一番下のだいだい色の球。重さがあるから、重力でゆれるんだよ。',
        promptHint:         '振り子の質量を集中させた点（重心）。位置エネルギー ↔ 運動エネルギーが交互に変換される。',
      },
      {
        id:                 'pivot',
        partName:           '支点',
        position:           [0, 1.2, 0],
        defaultExplanation: '上の方の小さなくろい点。ここを中心にゆれるよ。',
        promptHint:         'ピボット。摩擦が少ないほど振り子はより長く揺れ続ける。理想的な単振り子では支点での損失ゼロを仮定。',
      },
    ],
    attribution: 'AI Coding Agent 生成（Blender Python・generate-pendulum.py）',
    license:     'CC0 (familyai.jp 専用・完全オリジナル)',
    sourceUrl:   null,
    published:   true,
    isFeatured:  false,
  },
];

async function main() {
  console.log(`🌐 3D モデル ${MODELS.length} 件を upsert します...`);

  for (const m of MODELS) {
    const existing = await db
      .select({ id: tutor3dModels.id })
      .from(tutor3dModels)
      .where(eq(tutor3dModels.slug, m.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tutor3dModels)
        .set({ ...m, updatedAt: new Date() })
        .where(eq(tutor3dModels.slug, m.slug));
      console.log(`  ✅ UPDATE: ${m.slug}`);
    } else {
      await db.insert(tutor3dModels).values({ ...m });
      console.log(`  ✅ INSERT: ${m.slug}`);
    }
  }

  console.log('\n🎉 完了！');
  console.log('   - public/3d-models/ に GLB ファイルが配置されているか確認');
  console.log('   - 開発サーバーを起動: pnpm dev');
  console.log('   - http://localhost:3000/tools/ai-kyoshitsu でカタログ確認');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed 失敗:', err);
    process.exit(1);
  });
