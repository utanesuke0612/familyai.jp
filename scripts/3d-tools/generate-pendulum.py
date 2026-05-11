"""
generate-pendulum.py
─────────────────────────────────────────────────────────────
familyai.jp / うごくAI教室 — Phase 1 モデル「振り子の運動」AI 生成スクリプト

実行方法（macOS / Windows 両方）:
    blender --background --python generate-pendulum.py

出力:
    scripts/3d-tools/output/pendulum.glb

仕様:
  - 上部に木製スタンド（横棒 + 2本の脚 + 床）
  - 中央上部に支点
  - 細い糸（ロッド）が支点から伸びる
  - 末端におもり（鉄球風）
  - ±30度の範囲で振り子運動（Bezier 補間で自然なサイン波風モーション）
  - 1 往復 約 2 秒（周期）／5 往復ループ

教育角度:
  - 小学校高学年〜中学校
  - 物理（単振動・周期・重力の概念）

依存:
  - Blender 4.x / 5.x（bpy モジュール内蔵）
"""

import bpy
import math
from pathlib import Path

# ── 設定 ─────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "pendulum.glb"

# 振り子パラメータ
ROD_LENGTH = 2.0             # ロッドの長さ
BOB_RADIUS = 0.25            # おもりの半径
ROD_RADIUS = 0.025           # ロッドの太さ（細い糸）
AMPLITUDE_DEG = 30           # 振幅（度）
PERIOD_FRAMES = 48           # 1 往復のフレーム数（24fps なら 2 秒）
SWINGS = 5                   # 往復回数
ANIMATION_FRAMES = PERIOD_FRAMES * SWINGS

# スタンド
STAND_WIDTH = 1.5            # 横棒の長さ
STAND_HEIGHT = 2.5           # 脚の高さ
LEG_THICKNESS = 0.08
TOP_BAR_THICKNESS = 0.08
FLOOR_SIZE = 2.5

# 色（familyai トーン: cream / peach / brown 系）
COLOR_STAND       = (0.55, 0.40, 0.25, 1.0)   # 木製スタンド（茶）
COLOR_ROD         = (0.40, 0.40, 0.45, 1.0)   # ロッド（灰）
COLOR_BOB         = (0.95, 0.55, 0.30, 1.0)   # おもり（オレンジ）
COLOR_BOB_HIGH    = (1.00, 0.80, 0.50, 1.0)   # おもりハイライト
COLOR_PIVOT       = (0.30, 0.30, 0.30, 1.0)   # 支点（黒）
COLOR_FLOOR       = (0.95, 0.92, 0.85, 1.0)   # 床（クリーム）


# ── Blender 4.x / 5.x 両対応ヘルパー ─────────────────────
def _iter_action_fcurves(action):
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


def _set_bezier_smooth(obj):
    """全 keyframe を BEZIER 補間 + AUTO_CLAMPED で自然な揺れに"""
    if not obj.animation_data or not obj.animation_data.action:
        return
    for fcurve in _iter_action_fcurves(obj.animation_data.action):
        for kf in fcurve.keyframe_points:
            kf.interpolation = 'BEZIER'
            kf.handle_left_type = 'AUTO_CLAMPED'
            kf.handle_right_type = 'AUTO_CLAMPED'


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat, do_unlink=True)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh, do_unlink=True)


def create_material(name, color, roughness=0.6, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    return mat


def create_cube(name, scale, location, material, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


def create_cylinder(name, radius, depth, location, rotation_euler, material, vertices=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation_euler,
        vertices=vertices,
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


def create_sphere(name, radius, location, material, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        location=location,
        segments=32,
        ring_count=16,
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
    print("⚡ 振り子 3D モデル生成 開始")

    clear_scene()

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = ANIMATION_FRAMES
    scene.render.fps = 24

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. マテリアル準備
    mat_stand = create_material("Stand_Wood", COLOR_STAND, roughness=0.75)
    mat_rod   = create_material("Rod", COLOR_ROD, roughness=0.5, metallic=0.3)
    mat_bob   = create_material("Bob", COLOR_BOB, roughness=0.4, metallic=0.6)
    mat_pivot = create_material("Pivot", COLOR_PIVOT, roughness=0.3, metallic=0.8)
    mat_floor = create_material("Floor", COLOR_FLOOR, roughness=0.9)

    # 2. 床
    create_cube(
        "Floor",
        scale=(FLOOR_SIZE, FLOOR_SIZE, 0.05),
        location=(0, 0, -STAND_HEIGHT / 2 - 0.025),
        material=mat_floor,
    )

    # 3. スタンド（横棒 + 2 本の脚）
    # 左脚
    create_cube(
        "Stand_LeftLeg",
        scale=(LEG_THICKNESS, LEG_THICKNESS, STAND_HEIGHT),
        location=(-STAND_WIDTH / 2, 0, 0),
        material=mat_stand,
    )
    # 右脚
    create_cube(
        "Stand_RightLeg",
        scale=(LEG_THICKNESS, LEG_THICKNESS, STAND_HEIGHT),
        location=(STAND_WIDTH / 2, 0, 0),
        material=mat_stand,
    )
    # 横棒（上部）
    create_cube(
        "Stand_TopBar",
        scale=(STAND_WIDTH + LEG_THICKNESS, TOP_BAR_THICKNESS, TOP_BAR_THICKNESS),
        location=(0, 0, STAND_HEIGHT / 2),
        material=mat_stand,
    )

    # 4. 支点（pivot）位置
    pivot_z = STAND_HEIGHT / 2 - TOP_BAR_THICKNESS / 2
    # 支点を表現する小さな球（黒）
    create_sphere(
        "Pivot_Marker",
        radius=0.06,
        location=(0, 0, pivot_z),
        material=mat_pivot,
    )

    # 5. 振り子本体の親 Empty（支点位置に配置）
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, pivot_z))
    pendulum_pivot = bpy.context.active_object
    pendulum_pivot.name = "Pendulum_Pivot"

    # 6. ロッド（支点から下に伸びる）
    # cylinder は Z 軸方向に伸びるので、原点を上端に持ってくるため Z=-rod_length/2 に配置
    rod = create_cylinder(
        "Pendulum_Rod",
        radius=ROD_RADIUS,
        depth=ROD_LENGTH,
        location=(0, 0, -ROD_LENGTH / 2),
        rotation_euler=(0, 0, 0),
        material=mat_rod,
        vertices=8,
        parent=pendulum_pivot,
    )

    # 7. おもり（ロッドの下端）
    bob = create_sphere(
        "Pendulum_Bob",
        radius=BOB_RADIUS,
        location=(0, 0, -ROD_LENGTH - BOB_RADIUS * 0.3),
        material=mat_bob,
        parent=pendulum_pivot,
    )

    # 8. 振り子アニメーション（Y 軸回転で前後に揺れる）
    # Bezier 補間 + AUTO_CLAMPED で自然なサイン波風モーション
    amplitude_rad = math.radians(AMPLITUDE_DEG)

    # キーフレームを設定:
    # frame 1: 右端 (+amplitude)
    # frame PERIOD/2: 左端 (-amplitude)
    # frame PERIOD: 右端 (+amplitude)
    # ... ループ
    print(f"  - アニメーション: ±{AMPLITUDE_DEG}度 / 周期 {PERIOD_FRAMES/24:.1f}秒 / {SWINGS}往復")

    # Y 軸を中心に振らせる（XZ 平面で揺れる）
    for swing in range(SWINGS + 1):
        frame_right = swing * PERIOD_FRAMES + 1
        frame_left  = swing * PERIOD_FRAMES + PERIOD_FRAMES // 2 + 1
        # 右端
        pendulum_pivot.rotation_euler = (0, amplitude_rad, 0)
        pendulum_pivot.keyframe_insert(data_path="rotation_euler", frame=frame_right)
        # 左端
        if frame_left <= ANIMATION_FRAMES:
            pendulum_pivot.rotation_euler = (0, -amplitude_rad, 0)
            pendulum_pivot.keyframe_insert(data_path="rotation_euler", frame=frame_left)

    _set_bezier_smooth(pendulum_pivot)

    # 9. ライティング
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 5))
    sun_light = bpy.context.active_object
    sun_light.data.energy = 2.0
    sun_light.name = "MainLight"

    bpy.ops.object.light_add(type='SUN', location=(-2, 4, 3))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 0.5
    fill_light.name = "FillLight"

    # 10. ワールド背景（暖かみのあるクリーム）
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs[0].default_value = (0.99, 0.93, 0.85, 1.0)  # cream
        bg_node.inputs[1].default_value = 0.6

    # 11. カメラ（正面から少し上）
    bpy.ops.object.camera_add(location=(0, -5.5, 0.5), rotation=(math.radians(85), 0, 0))
    cam = bpy.context.active_object
    cam.name = "Camera"
    scene.camera = cam

    # 12. GLB エクスポート
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

    # 13. レポート
    if OUTPUT_FILE.exists():
        size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
        print(f"\n✅ 生成完了: {OUTPUT_FILE}")
        print(f"   サイズ: {size_mb:.2f} MB")
        if size_mb > 2:
            print(f"   ⚠️  2MB 超過 → compress.sh で追加圧縮推奨")
        print(f"\n💡 ホットスポット候補:")
        print(f"   - おもり（bob）")
        print(f"   - 支点（pivot point）")
        print(f"   - 糸 / ロッド（string / rod）")
        print(f"   - スタンド（支柱・床）")
        print(f"\n📐 教えるポイント:")
        print(f"   - 単振動 / 周期 / 振幅")
        print(f"   - 重力による位置エネルギー ↔ 運動エネルギーの変換")
        print(f"   - 糸の長さで周期が変わる（ガリレオの発見）")
    else:
        print(f"\n❌ エクスポート失敗")


if __name__ == "__main__":
    main()
