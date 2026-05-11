"""
generate-dna-helix.py
─────────────────────────────────────────────────────────────
familyai.jp / うごくAI教室 — Phase 1 モデル「DNA 二重らせん」AI 生成スクリプト

実行方法（macOS / Windows 両方）:
    blender --background --python generate-dna-helix.py

出力:
    scripts/3d-tools/output/dna-helix.glb

仕様:
  - 2 本の糖リン酸骨格（らせん）が向かい合って巻く構造
  - 塩基対（base pair）を一定間隔で接続
  - 4 種類の塩基色で交互配置（A=赤 / T=青 / G=緑 / C=黄）
  - 全体をゆっくり Y 軸回転（観察しやすさ重視）
  - ホットスポット推奨: 塩基対 / 二重らせん / 糖リン酸骨格 / 水素結合

教育角度:
  - 小学校高学年〜中学校
  - 生物（実装上は化学カテゴリにも入れられる）

依存:
  - Blender 4.x / 5.x（bpy モジュール内蔵）
"""

import bpy
import math
from pathlib import Path

# ── 設定 ─────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "dna-helix.glb"
ANIMATION_FRAMES = 240  # 10秒（24fps）でゆっくり 1 回転

# らせんパラメータ
HELIX_RADIUS = 0.6          # らせん半径
PITCH = 0.40                 # 1 ピッチ（1 ターンの高さ）
TURNS = 5                    # ターン数（らせんの長さ）
BASE_PAIRS = 30              # 塩基対の数
BACKBONE_DENSITY = 6         # 骨格球を 1 塩基対の間に何個入れるか

# 色（peach / orange / cream / brown 系の familyai トーンも入れる）
BACKBONE_COLOR_A = (0.95, 0.55, 0.35, 1.0)   # オレンジ系
BACKBONE_COLOR_B = (0.25, 0.55, 0.85, 1.0)   # 青系
# 塩基対は 4 色を順番にループ
BASE_COLORS = [
    (0.95, 0.30, 0.35, 1.0),   # A: 赤
    (0.25, 0.55, 0.85, 1.0),   # T: 青
    (0.40, 0.85, 0.45, 1.0),   # G: 緑
    (0.95, 0.85, 0.30, 1.0),   # C: 黄
]
BASE_LABELS = ['A', 'T', 'G', 'C']


# ── Blender 4.x / 5.x 両対応ヘルパー ─────────────────────
def _iter_action_fcurves(action):
    """Slotted Actions（Blender 4.4+）と従来 API の両方に対応"""
    legacy = getattr(action, 'fcurves', None)
    if legacy is not None:
        for fc in legacy:
            yield fc
        return
    layers = getattr(action, 'layers', None) or []
    for layer in layers:
        strips = getattr(layer, 'strips', None) or []
        for strip in strips:
            channelbags = getattr(strip, 'channelbags', None) or []
            for cb in channelbags:
                fcurves = getattr(cb, 'fcurves', None) or []
                for fc in fcurves:
                    yield fc


def _set_linear_interpolation(obj):
    if not obj.animation_data or not obj.animation_data.action:
        return
    for fcurve in _iter_action_fcurves(obj.animation_data.action):
        for kf in fcurve.keyframe_points:
            kf.interpolation = 'LINEAR'


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat, do_unlink=True)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh, do_unlink=True)


def create_material(name, color, emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = 0.5
        if emissive_strength > 0:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = color
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = color
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return mat


def create_sphere(name, radius, location, material, segments=16, rings=8, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        location=location,
        segments=segments,
        ring_count=rings,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


def create_cylinder(name, radius, depth, location, rotation_euler, material, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation_euler,
        vertices=12,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


# ── メイン処理 ───────────────────────────────────────────
def main():
    print("🧬 DNA 二重らせん 3D モデル生成 開始")

    clear_scene()

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = ANIMATION_FRAMES
    scene.render.fps = 24

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. 親 Empty（全体回転用）
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    parent = bpy.context.active_object
    parent.name = "DNA_Root"

    # 2. 骨格マテリアル
    mat_strand_a = create_material("Strand_A", BACKBONE_COLOR_A)
    mat_strand_b = create_material("Strand_B", BACKBONE_COLOR_B)

    # 3. らせん骨格（細かい球を連ねて表現）
    total_steps = BASE_PAIRS * BACKBONE_DENSITY
    angle_per_step = (TURNS * 2 * math.pi) / total_steps
    height_per_step = (TURNS * PITCH) / total_steps
    total_height = TURNS * PITCH

    # Y 軸を「高さ」にする（らせんが垂直に立つ）
    print(f"  - 骨格球の総数: {total_steps * 2}")
    for i in range(total_steps):
        angle = i * angle_per_step
        z = i * height_per_step - total_height / 2  # 中心を 0 に合わせる

        # Strand A
        x1 = HELIX_RADIUS * math.cos(angle)
        y1 = HELIX_RADIUS * math.sin(angle)
        create_sphere(
            f"BackboneA_{i:03d}", 0.07, (x1, y1, z),
            mat_strand_a, segments=10, rings=6, parent=parent,
        )

        # Strand B（180度反対側）
        x2 = HELIX_RADIUS * math.cos(angle + math.pi)
        y2 = HELIX_RADIUS * math.sin(angle + math.pi)
        create_sphere(
            f"BackboneB_{i:03d}", 0.07, (x2, y2, z),
            mat_strand_b, segments=10, rings=6, parent=parent,
        )

    # 4. 塩基対（base pairs）
    # base_materials: 4 色を順にループ
    base_mats = [create_material(f"Base_{lbl}", color) for lbl, color in zip(BASE_LABELS, BASE_COLORS)]

    print(f"  - 塩基対の数: {BASE_PAIRS}")
    step_per_base = total_steps // BASE_PAIRS
    for i in range(BASE_PAIRS):
        step = i * step_per_base
        angle = step * angle_per_step
        z = step * height_per_step - total_height / 2

        # 塩基対の両端
        x1 = HELIX_RADIUS * math.cos(angle)
        y1 = HELIX_RADIUS * math.sin(angle)
        x2 = HELIX_RADIUS * math.cos(angle + math.pi)
        y2 = HELIX_RADIUS * math.sin(angle + math.pi)

        # 中点と方向
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        # XY 平面の角度（cylinder を寝かせるための回転）
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx * dx + dy * dy)
        angle_z = math.atan2(dy, dx)

        # cylinder は Z 軸方向に伸びるので、Y 軸 90度回転して水平に寝かせ、
        # さらに Z 軸で base pair 方向に合わせる
        # → 結局 (rot_x=0, rot_y=pi/2, rot_z=angle_z) で水平方向
        mat = base_mats[i % 4]
        create_cylinder(
            f"BasePair_{i:02d}_{BASE_LABELS[i % 4]}",
            radius=0.05,
            depth=length * 0.95,    # 骨格にめり込まないよう少し短く
            location=(mid_x, mid_y, z),
            rotation_euler=(0, math.pi / 2, angle_z),
            material=mat,
            parent=parent,
        )

    # 5. 全体回転アニメ（Y 軸を中心にゆっくり 1 回転）
    parent.rotation_euler = (0, 0, 0)
    parent.keyframe_insert(data_path="rotation_euler", frame=1)
    parent.rotation_euler = (0, 0, 2 * math.pi)
    parent.keyframe_insert(data_path="rotation_euler", frame=ANIMATION_FRAMES)
    _set_linear_interpolation(parent)

    # 6. ライティング
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 5))
    sun_light = bpy.context.active_object
    sun_light.data.energy = 1.8
    sun_light.name = "MainLight"

    bpy.ops.object.light_add(type='SUN', location=(-3, 3, -2))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 0.6
    fill_light.name = "FillLight"

    # 7. ワールド背景（淡いクリーム色・familyai トーン）
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs[0].default_value = (0.99, 0.93, 0.85, 1.0)  # cream
        bg_node.inputs[1].default_value = 0.5

    # 8. カメラ
    bpy.ops.object.camera_add(location=(0, -4.5, 0), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.active_object
    cam.name = "Camera"
    scene.camera = cam

    # 9. GLB エクスポート
    print(f"\n📦 エクスポート中: {OUTPUT_FILE}")
    bpy.ops.object.select_all(action='SELECT')

    export_kwargs = {
        'filepath': str(OUTPUT_FILE),
        'export_format': 'GLB',
        'use_selection': False,
        'export_apply': True,
        'export_animations': True,
        'export_lights': False,
        'export_cameras': False,
        'export_yup': True,
    }

    try:
        export_kwargs['export_draco_mesh_compression_enable'] = True
        export_kwargs['export_draco_mesh_compression_level'] = 6
        bpy.ops.export_scene.gltf(**export_kwargs)
    except TypeError:
        export_kwargs.pop('export_draco_mesh_compression_enable', None)
        export_kwargs.pop('export_draco_mesh_compression_level', None)
        bpy.ops.export_scene.gltf(**export_kwargs)
        print("⚠️  Draco 圧縮なしで出力（compress.sh で別途圧縮してください）")

    # 10. レポート
    if OUTPUT_FILE.exists():
        size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
        print(f"\n✅ 生成完了: {OUTPUT_FILE}")
        print(f"   サイズ: {size_mb:.2f} MB")
        if size_mb > 2:
            print(f"   ⚠️  2MB 超過 → compress.sh で追加圧縮推奨")
        print(f"\n💡 ホットスポット候補:")
        print(f"   - 塩基対 (base pair・A-T / G-C)")
        print(f"   - 糖リン酸骨格 (sugar-phosphate backbone)")
        print(f"   - 二重らせん構造")
        print(f"   - 4 種類の塩基（A 赤・T 青・G 緑・C 黄）")
    else:
        print(f"\n❌ エクスポート失敗")


if __name__ == "__main__":
    main()
