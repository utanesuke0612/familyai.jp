"""
generate-solar-system.py
─────────────────────────────────────────────────────────────
familyai.jp / うごくAI教室 — Phase 1 モデル「太陽系」AI 生成スクリプト

実行方法（macOS / Windows 両方）:
    blender --background --python generate-solar-system.py

出力:
    scripts/3d-tools/output/solar-system.glb

仕様 (junli 確認済み):
  - 太陽 + 8 惑星（水星〜海王星）
  - サイズ比は「教育的に圧縮」（実寸だと水星見えないので地球比 3 倍程度に縮める）
  - 軌道は「円」として表示（実際は楕円だが教育用簡略化）
  - アニメーション: 惑星が公転（ゆっくり回る・各惑星で公転周期を変える）
  - 色: シンプルなマテリアル（NASA テクスチャは Phase 2 で追加可能）
  - ホットスポット: 4〜5 個（太陽・地球・木星・土星・月）
    → hotspot 座標は hotspot-picker.html で別途採取（このスクリプトでは出力しない）

依存:
  - Blender 3.0 以上（bpy モジュール内蔵）
  - 追加 pip パッケージ不要

ライセンス:
  - 完全オリジナル生成（権利問題なし）
  - familyai.jp 専用・CC0 として扱う
"""

import bpy
import math
import os
from pathlib import Path

# ── 設定 ─────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "solar-system.glb"
ANIMATION_FRAMES = 240  # 10 秒（24fps）

# ── 惑星定義（教育向け縮小スケール） ──────────────────────
# 実寸の太陽系では地球比で太陽 109倍・木星 11倍・水星 0.38倍 だが、
# 全部入れると太陽が画面を覆い水星が見えなくなる。
# 教育目的で「太陽 = 直径 2.0・地球 = 直径 0.5・水星 = 0.2」程度に調整。
SOLAR_BODIES = [
    # name,       radius, distance, color (RGBA 0-1),                rotation_speed
    ("Sun",       1.0,    0.0,     (1.0, 0.85, 0.1, 1.0),           0.0),     # 中心に固定
    ("Mercury",   0.12,   1.8,     (0.65, 0.65, 0.65, 1.0),         4.15),    # 公転速度 fastest
    ("Venus",     0.18,   2.4,     (0.95, 0.75, 0.4, 1.0),          1.62),
    ("Earth",     0.20,   3.0,     (0.25, 0.55, 0.95, 1.0),         1.0),     # 基準
    ("Mars",      0.16,   3.6,     (0.85, 0.35, 0.2, 1.0),          0.53),
    ("Jupiter",   0.55,   4.8,     (0.85, 0.7, 0.55, 1.0),          0.084),
    ("Saturn",    0.48,   6.0,     (0.95, 0.85, 0.65, 1.0),         0.034),
    ("Uranus",    0.32,   7.0,     (0.55, 0.85, 0.95, 1.0),         0.012),
    ("Neptune",   0.30,   7.8,     (0.25, 0.4, 0.85, 1.0),          0.006),
]


# ── ユーティリティ ───────────────────────────────────────
def clear_scene():
    """既存のシーンを全削除"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # 残ったマテリアル・メッシュもクリーンアップ
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat, do_unlink=True)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh, do_unlink=True)


def create_material(name, color, emissive_strength=0.0):
    """単純な PBR マテリアル（emission 強度指定で太陽の発光表現）"""
    mat = bpy.data.materials.new(name=name)
    # Blender 4.x 以前は use_nodes=False がデフォルトなので明示的に有効化
    # Blender 5.x は nodes がデフォルトで有効・use_nodes は deprecated（警告のみ）
    try:
        mat.use_nodes = True
    except Exception:
        pass  # 5.x 以降の deprecation 対応
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = 0.7
        if emissive_strength > 0:
            # 太陽は発光させる
            # "Emission Color" / "Emission Strength" は Blender 4.x 以降の名前
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = color
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = color
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return mat


def create_sphere(name, radius, location, material):
    """UV 球を作成して指定位置に配置"""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        location=location,
        segments=32,
        ring_count=16,
    )
    obj = bpy.context.active_object
    obj.name = name
    # スムーズシェード
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def create_orbit_ring(distance, name):
    """細い円環（軌道線）を作成"""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=distance,
        minor_radius=0.01,
        major_segments=64,
        minor_segments=4,
        location=(0, 0, 0),
    )
    obj = bpy.context.active_object
    obj.name = f"Orbit_{name}"
    # 軌道線のマテリアル（半透明グレー）
    mat = create_material(f"OrbitMat_{name}", (0.7, 0.7, 0.7, 0.3))
    mat.blend_method = 'BLEND'
    mat.diffuse_color = (0.7, 0.7, 0.7, 0.3)
    obj.data.materials.append(mat)
    return obj


def _iter_action_fcurves(action):
    """
    Blender 4.x / 5.x 両対応で Action 内の全 fcurve を返す。
    Blender 4.x 以前: action.fcurves に直接アクセス
    Blender 4.4+ / 5.x: action.layers[].strips[].channelbags[].fcurves
                        （Slotted Actions の導入で構造が階層化された）
    """
    # 旧 API: action.fcurves
    legacy = getattr(action, 'fcurves', None)
    if legacy is not None:
        for fcurve in legacy:
            yield fcurve
        return

    # 新 API: 階層を辿る
    layers = getattr(action, 'layers', None)
    if not layers:
        return
    for layer in layers:
        strips = getattr(layer, 'strips', None) or []
        for strip in strips:
            # channelbags は collection
            channelbags = getattr(strip, 'channelbags', None) or []
            for cb in channelbags:
                fcurves = getattr(cb, 'fcurves', None) or []
                for fcurve in fcurves:
                    yield fcurve


def _set_linear_interpolation(obj):
    """全 keyframe を LINEAR 補間に設定（Blender 4.x / 5.x 両対応）"""
    if not obj.animation_data or not obj.animation_data.action:
        return
    for fcurve in _iter_action_fcurves(obj.animation_data.action):
        for kf in fcurve.keyframe_points:
            kf.interpolation = 'LINEAR'


def add_orbit_animation(obj, distance, rotation_speed, frame_total):
    """
    親 Empty を中心に配置し、その回転で公転を表現。
    rotation_speed: 地球を 1.0 とした相対速度（1 周/animation_frames で公転）
    """
    # Empty を中心軸として作成
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    empty = bpy.context.active_object
    empty.name = f"Pivot_{obj.name}"

    # obj を empty の子に
    obj.parent = empty
    obj.location = (distance, 0, 0)

    # Empty に Z 軸回転のキーフレーム
    # rotation_speed = 1.0 で 1 周/animation_frames
    total_rotation = 2 * math.pi * rotation_speed

    empty.rotation_euler = (0, 0, 0)
    empty.keyframe_insert(data_path="rotation_euler", frame=1)

    empty.rotation_euler = (0, 0, total_rotation)
    empty.keyframe_insert(data_path="rotation_euler", frame=frame_total)

    # 線形補間（一定速度で公転）— Blender 4.x / 5.x 両対応
    _set_linear_interpolation(empty)

    return empty


# ── メイン処理 ───────────────────────────────────────────
def main():
    print("🪐 太陽系 3D モデル生成 開始")

    # 1. シーンクリア
    clear_scene()

    # 2. シーン設定
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = ANIMATION_FRAMES
    scene.render.fps = 24

    # 3. 出力ディレクトリ作成
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 4. 各天体を生成
    print(f"  - 天体数: {len(SOLAR_BODIES)}")
    for name, radius, distance, color, speed in SOLAR_BODIES:
        if name == "Sun":
            # 太陽: 発光させて中心に固定
            material = create_material(f"{name}_Material", color, emissive_strength=2.5)
            sun = create_sphere(name, radius, (0, 0, 0), material)
            print(f"    ☀️  {name}: 中心配置")
        else:
            # 惑星: 公転アニメーション付き
            material = create_material(f"{name}_Material", color, emissive_strength=0)
            planet = create_sphere(name, radius, (0, 0, 0), material)
            add_orbit_animation(planet, distance, speed, ANIMATION_FRAMES)
            create_orbit_ring(distance, name)
            print(f"    🪐 {name}: 距離 {distance}・速度 {speed}x")

    # 5. ライティング（太陽の発光だけだと真っ暗なので環境光追加）
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 5))
    sun_light = bpy.context.active_object
    sun_light.data.energy = 1.5
    sun_light.name = "FillLight"

    # 6. ワールド（背景・暗めにして宇宙感）
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs[0].default_value = (0.02, 0.02, 0.05, 1.0)  # 濃紺
        bg_node.inputs[1].default_value = 0.3  # 光量

    # 7. カメラ（俯瞰視点）
    bpy.ops.object.camera_add(location=(0, -12, 6), rotation=(math.radians(60), 0, 0))
    cam = bpy.context.active_object
    cam.name = "Camera"
    scene.camera = cam

    # 8. GLB エクスポート
    print(f"\n📦 エクスポート中: {OUTPUT_FILE}")

    # 全オブジェクト選択
    bpy.ops.object.select_all(action='SELECT')

    # glTF 2.0 でエクスポート（Blender 4.x の引数名に対応）
    export_kwargs = {
        'filepath': str(OUTPUT_FILE),
        'export_format': 'GLB',
        'use_selection': False,           # 全てエクスポート
        'export_apply': True,             # Modifier 適用
        'export_animations': True,
        'export_lights': False,           # ライトは glTF で互換性が低い
        'export_cameras': False,
        'export_yup': True,
    }

    # Blender 4.x では export_draco_mesh_compression_enable を指定可能
    try:
        export_kwargs['export_draco_mesh_compression_enable'] = True
        export_kwargs['export_draco_mesh_compression_level'] = 6
        bpy.ops.export_scene.gltf(**export_kwargs)
    except TypeError:
        # 古い Blender の場合 Draco オプションを外して再試行
        export_kwargs.pop('export_draco_mesh_compression_enable', None)
        export_kwargs.pop('export_draco_mesh_compression_level', None)
        bpy.ops.export_scene.gltf(**export_kwargs)
        print("⚠️  Draco 圧縮なしで出力（compress.sh で別途圧縮してください）")

    # 9. 結果レポート
    if OUTPUT_FILE.exists():
        size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
        print(f"\n✅ 生成完了: {OUTPUT_FILE}")
        print(f"   サイズ: {size_mb:.2f} MB")
        if size_mb > 2:
            print(f"   ⚠️  2MB 超過 → compress.sh で追加圧縮推奨")
        print(f"\n💡 次のステップ:")
        print(f"   1. preview.html で確認: scripts/3d-tools/preview.html を開いて GLB をドロップ")
        print(f"   2. 必要なら追加圧縮: ./compress.sh output/solar-system.glb final/")
        print(f"   3. hotspot 採取: hotspot-picker.html で 太陽・地球・木星・土星 をクリック")
        print(f"   4. Mac の場合 USDZ 生成: Reality Converter で final/solar-system.usdz を作成")
        print(f"   5. attribution-template.md をコピーして attributions/solar-system.md に記入")
    else:
        print(f"\n❌ エクスポート失敗")


if __name__ == "__main__":
    main()
