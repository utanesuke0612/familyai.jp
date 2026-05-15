#!/usr/bin/env python3
"""Generate an educational Solar System GLB with procedural textures.

The GLB is intentionally compact and object-oriented for classroom use:
named planets, orbit rings, Japanese labels, simple animation, and embedded
PNG textures.  Blender is not required to rebuild the GLB, but the resulting
file imports into Blender as separated editable objects.
"""

from __future__ import annotations

import binascii
import json
import math
import random
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "models"
TEXTURE_DIR = ROOT / "assets" / "textures"
OUT_GLB = OUT_DIR / "solar_system.glb"

COMP_FLOAT = 5126
COMP_U16 = 5123
COMP_U32 = 5125
ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963


def pad4(data: bytearray) -> None:
    while len(data) % 4:
        data.append(0)


def quat_x(degrees: float) -> list[float]:
    radians = math.radians(degrees) * 0.5
    return [math.sin(radians), 0.0, 0.0, math.cos(radians)]


def quat_y(degrees: float) -> list[float]:
    radians = math.radians(degrees) * 0.5
    return [0.0, math.sin(radians), 0.0, math.cos(radians)]


def quat_z(degrees: float) -> list[float]:
    radians = math.radians(degrees) * 0.5
    return [0.0, 0.0, math.sin(radians), math.cos(radians)]


def clamp(v: float, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, int(v)))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(clamp(a[i] * (1.0 - t) + b[i] * t) for i in range(3))


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> None:
    """Write a simple non-interlaced RGBA PNG."""
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", binascii.crc32(kind + payload) & 0xFFFFFFFF)
        )

    data = bytearray(b"\x89PNG\r\n\x1a\n")
    data.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
    data.extend(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
    data.extend(chunk(b"IEND", b""))
    path.write_bytes(data)


def noise(x: float, y: float, seed: int) -> float:
    n = math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
    return n - math.floor(n)


def fbm(x: float, y: float, seed: int) -> float:
    value = 0.0
    amp = 0.5
    freq = 1.0
    for _ in range(5):
        value += amp * noise(x * freq, y * freq, seed)
        freq *= 2.0
        amp *= 0.5
    return value


def soft_stripe(v: float, center: float, width: float) -> float:
    d = abs(v - center) / max(width, 0.0001)
    return max(0.0, 1.0 - d * d)


def planet_texture(name: str, width: int = 768, height: int = 384) -> Path:
    path = TEXTURE_DIR / f"{name.lower()}_surface.png"
    pixels: list[tuple[int, int, int, int]] = []
    rng = random.Random(name)
    seed = rng.randint(1, 9999)

    for y in range(height):
        v = y / (height - 1)
        lat = (v - 0.5) * math.pi
        for x in range(width):
            u = x / (width - 1)
            n = fbm(u * 5.0, v * 4.0, seed)
            fine = fbm(u * 18.0, v * 12.0, seed + 11)

            if name == "sun":
                flame = 0.5 + 0.5 * math.sin(u * math.tau * 10.0 + v * 8.0 + fine * 5.5)
                cell = 0.5 + 0.5 * math.sin((u * 18.0 + n * 2.0) * math.tau) * math.cos((v * 9.0 + fine) * math.tau)
                color = mix((255, 117, 8), (255, 232, 52), 0.45 * n + 0.32 * flame + 0.23 * cell)
                if fine > 0.82:
                    color = mix(color, (136, 54, 11), 0.35)
            elif name == "mercury":
                crater = 1.0 if fine > 0.70 else 0.0
                base = mix((82, 82, 78), (184, 176, 160), 0.35 + 0.65 * n)
                color = mix(base, (45, 45, 42), crater * 0.55)
            elif name == "venus":
                swirl = 0.5 + 0.5 * math.sin((u * 8.0 + v * 4.0 + fine * 0.8) * math.tau)
                cloud = 0.5 + 0.5 * math.sin((u * 15.0 - v * 6.0 + n) * math.tau)
                color = mix((166, 111, 42), (247, 213, 117), 0.28 * n + 0.45 * swirl + 0.18 * cloud)
            elif name == "earth":
                land_noise = fbm(u * 5.2 + 1.6 * math.sin(v * math.tau), v * 3.6, seed)
                land = land_noise > 0.55
                cloud = fine > 0.76 or (0.45 + 0.55 * math.sin((u * 9.0 + v * 2.5) * math.tau + n) > 0.86)
                polar = abs(math.sin(lat)) > 0.86
                color = mix((18, 71, 155), (36, 128, 206), 0.35 + 0.5 * n) if not land else mix((36, 112, 55), (116, 152, 77), n)
                if land and n > 0.72:
                    color = (158, 139, 83)
                if polar:
                    color = mix(color, (232, 238, 232), 0.75)
                if cloud:
                    color = mix(color, (244, 248, 242), 0.58)
            elif name == "mars":
                dust = 0.5 + 0.5 * math.sin((u * 6.5 + fine) * math.tau)
                color = mix((111, 40, 24), (224, 104, 46), 0.42 * n + 0.35 * dust)
                if fine > 0.77:
                    color = mix(color, (74, 36, 28), 0.58)
                if abs(v - 0.18) < 0.035 or abs(v - 0.82) < 0.035:
                    color = mix(color, (224, 184, 144), 0.38)
            elif name == "jupiter":
                centers = [0.16, 0.25, 0.35, 0.46, 0.56, 0.67, 0.78, 0.87]
                band_value = sum(soft_stripe(v + 0.018 * math.sin(u * math.tau * 3.0 + c * 7.0), c, 0.035) for c in centers)
                wave = 0.5 + 0.5 * math.sin(u * math.tau * 9.0 + v * 14.0 + fine * 1.8)
                color = mix((217, 188, 139), (126, 76, 42), min(1.0, band_value * 0.48 + wave * 0.16))
                color = mix(color, (248, 238, 214), 0.18 * (1.0 - band_value))
                if 0.54 < u < 0.70 and 0.48 < v < 0.62:
                    spot = ((u - 0.62) / 0.09) ** 2 + ((v - 0.55) / 0.055) ** 2
                    if spot < 1.0:
                        color = mix(color, (166, 70, 42), 0.88 * (1.0 - spot))
            elif name == "saturn":
                stripe = 0.5 + 0.5 * math.sin(v * math.tau * 10.0 + fine * 0.9)
                color = mix((169, 128, 70), (237, 211, 151), stripe * 0.74 + n * 0.22)
            elif name == "uranus":
                stripe = 0.5 + 0.5 * math.sin((v * 5.0 + u * 0.5) * math.tau)
                color = mix((92, 181, 196), (204, 240, 238), 0.35 * n + 0.24 * math.cos(lat) ** 2 + 0.18 * stripe)
            elif name == "neptune":
                stripe = 0.5 + 0.5 * math.sin(v * math.tau * 6.0 + fine * 2.0)
                color = mix((20, 45, 160), (77, 149, 245), 0.48 * n + 0.28 * stripe)
                if 0.70 < u < 0.82 and 0.38 < v < 0.48:
                    storm = ((u - 0.76) / 0.06) ** 2 + ((v - 0.43) / 0.035) ** 2
                    if storm < 1.0:
                        color = mix(color, (16, 24, 82), 0.58 * (1.0 - storm))
            elif name == "moon":
                crater = 1.0 if fine > 0.75 else 0.0
                base = mix((128, 128, 124), (205, 204, 194), n)
                color = mix(base, (88, 88, 84), crater * 0.55)
            else:
                color = (200, 200, 200)
            pixels.append((*color, 255))

    write_png(path, width, height, pixels)
    return path


def ring_texture(name: str) -> Path:
    path = TEXTURE_DIR / f"{name.lower()}_ring.png"
    width, height = 256, 16
    pixels = []
    for _y in range(height):
        for x in range(width):
            u = x / (width - 1)
            band = 0.5 + 0.5 * math.sin(u * math.tau * 15.0)
            alpha = 120 if 0.08 < u < 0.92 else 35
            color = mix((126, 103, 75), (230, 210, 163), band)
            pixels.append((*color, alpha))
    write_png(path, width, height, pixels)
    return path


@dataclass
class Primitive:
    positions: list[tuple[float, float, float]]
    normals: list[tuple[float, float, float]]
    indices: list[int]
    material: int
    texcoords: list[tuple[float, float]] | None = None


class GlbBuilder:
    def __init__(self) -> None:
        self.bin = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.materials: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []
        self.animations: list[dict] = []
        self.images: list[dict] = []
        self.textures: list[dict] = []
        self.samplers: list[dict] = [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}]

    def add_image_texture(self, path: Path, name: str) -> int:
        png = path.read_bytes()
        pad4(self.bin)
        offset = len(self.bin)
        self.bin.extend(png)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(png)}
        self.buffer_views.append(view)
        view_index = len(self.buffer_views) - 1
        self.images.append({"name": name, "mimeType": "image/png", "bufferView": view_index})
        self.textures.append({"sampler": 0, "source": len(self.images) - 1})
        pad4(self.bin)
        return len(self.textures) - 1

    def material(
        self,
        name: str,
        color: tuple[float, float, float, float],
        *,
        texture: int | None = None,
        metallic: float = 0.0,
        roughness: float = 0.72,
        emissive: tuple[float, float, float] | None = None,
        alpha: str | None = None,
        double_sided: bool = False,
    ) -> int:
        pbr = {
            "baseColorFactor": list(color),
            "metallicFactor": metallic,
            "roughnessFactor": roughness,
        }
        if texture is not None:
            pbr["baseColorTexture"] = {"index": texture}
        mat = {"name": name, "pbrMetallicRoughness": pbr}
        if emissive:
            mat["emissiveFactor"] = list(emissive)
        if alpha:
            mat["alphaMode"] = alpha
        if double_sided:
            mat["doubleSided"] = True
        self.materials.append(mat)
        return len(self.materials) - 1

    def accessor(
        self,
        values: list[tuple[float, ...]] | list[int] | list[float],
        component_type: int,
        accessor_type: str,
        target: int | None = None,
    ) -> int:
        pad4(self.bin)
        offset = len(self.bin)
        if component_type == COMP_FLOAT:
            if accessor_type == "SCALAR":
                flat = [float(v) for v in values]  # type: ignore[arg-type]
            else:
                flat = [float(x) for row in values for x in row]  # type: ignore[union-attr]
            self.bin.extend(struct.pack("<" + "f" * len(flat), *flat))
        elif component_type == COMP_U16:
            flat_i = [int(v) for v in values]  # type: ignore[arg-type]
            self.bin.extend(struct.pack("<" + "H" * len(flat_i), *flat_i))
        elif component_type == COMP_U32:
            flat_i = [int(v) for v in values]  # type: ignore[arg-type]
            self.bin.extend(struct.pack("<" + "I" * len(flat_i), *flat_i))
        else:
            raise ValueError(component_type)
        byte_length = len(self.bin) - offset
        view = {"buffer": 0, "byteOffset": offset, "byteLength": byte_length}
        if target is not None:
            view["target"] = target
        self.buffer_views.append(view)
        view_index = len(self.buffer_views) - 1
        accessor = {"bufferView": view_index, "componentType": component_type, "count": len(values), "type": accessor_type}
        if component_type == COMP_FLOAT and accessor_type in {"VEC2", "VEC3", "VEC4", "SCALAR"}:
            if accessor_type == "SCALAR":
                cols = [[float(v)] for v in values]  # type: ignore[arg-type]
            else:
                cols = [[float(x) for x in row] for row in values]  # type: ignore[union-attr]
            transposed = list(zip(*cols))
            accessor["min"] = [min(col) for col in transposed]
            accessor["max"] = [max(col) for col in transposed]
        pad4(self.bin)
        self.accessors.append(accessor)
        return len(self.accessors) - 1

    def mesh(self, name: str, primitives: list[Primitive]) -> int:
        gltf_prims = []
        for prim in primitives:
            pos = self.accessor(prim.positions, COMP_FLOAT, "VEC3", ARRAY_BUFFER)
            nrm = self.accessor(prim.normals, COMP_FLOAT, "VEC3", ARRAY_BUFFER)
            attrs = {"POSITION": pos, "NORMAL": nrm}
            if prim.texcoords is not None:
                attrs["TEXCOORD_0"] = self.accessor(prim.texcoords, COMP_FLOAT, "VEC2", ARRAY_BUFFER)
            index_type = COMP_U16 if max(prim.indices, default=0) < 65535 else COMP_U32
            idx = self.accessor(prim.indices, index_type, "SCALAR", ELEMENT_ARRAY_BUFFER)
            gltf_prims.append({"attributes": attrs, "indices": idx, "material": prim.material, "mode": 4})
        self.meshes.append({"name": name, "primitives": gltf_prims})
        return len(self.meshes) - 1

    def node(
        self,
        name: str,
        *,
        mesh: int | None = None,
        children: list[int] | None = None,
        translation: tuple[float, float, float] | None = None,
        rotation: list[float] | None = None,
        scale: tuple[float, float, float] | None = None,
    ) -> int:
        node: dict = {"name": name}
        if mesh is not None:
            node["mesh"] = mesh
        if children:
            node["children"] = children
        if translation:
            node["translation"] = list(translation)
        if rotation:
            node["rotation"] = rotation
        if scale:
            node["scale"] = list(scale)
        self.nodes.append(node)
        return len(self.nodes) - 1

    def add_rotation_animation(self, node_index: int, name: str, seconds: float, axis: str) -> None:
        times = [0.0, seconds / 3.0, seconds * 2.0 / 3.0, seconds]
        rots = [quat_z(0), quat_z(120), quat_z(240), quat_z(360)] if axis == "z" else [quat_y(0), quat_y(120), quat_y(240), quat_y(360)]
        time_acc = self.accessor(times, COMP_FLOAT, "SCALAR")
        rot_acc = self.accessor(rots, COMP_FLOAT, "VEC4")
        self.animations.append(
            {
                "name": name,
                "samplers": [{"input": time_acc, "output": rot_acc, "interpolation": "LINEAR"}],
                "channels": [{"sampler": 0, "target": {"node": node_index, "path": "rotation"}}],
            }
        )

    def write(self, path: Path, scene_nodes: list[int]) -> None:
        pad4(self.bin)
        doc = {
            "asset": {"version": "2.0", "generator": "generate_solar_system.py"},
            "scene": 0,
            "scenes": [{"name": "Educational_Solar_System", "nodes": scene_nodes}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "buffers": [{"byteLength": len(self.bin)}],
            "bufferViews": self.buffer_views,
            "accessors": self.accessors,
            "samplers": self.samplers,
            "images": self.images,
            "textures": self.textures,
        }
        if self.animations:
            doc["animations"] = self.animations
        json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
        while len(json_bytes) % 4:
            json_bytes += b" "
        total_length = 12 + 8 + len(json_bytes) + 8 + len(self.bin)
        glb = bytearray(struct.pack("<III", 0x46546C67, 2, total_length))
        glb.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
        glb.extend(json_bytes)
        glb.extend(struct.pack("<I4s", len(self.bin), b"BIN\0"))
        glb.extend(self.bin)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(glb)


def sphere_primitive(radius: float, segments: int, rings: int, material: int) -> Primitive:
    verts: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    uvs: list[tuple[float, float]] = []
    indices: list[int] = []
    for i in range(rings + 1):
        theta = math.pi * i / rings
        z = math.cos(theta)
        ring_r = math.sin(theta)
        for j in range(segments + 1):
            phi = math.tau * j / segments
            nx = ring_r * math.cos(phi)
            ny = ring_r * math.sin(phi)
            verts.append((radius * nx, radius * ny, radius * z))
            normals.append((nx, ny, z))
            uvs.append((j / segments, i / rings))
    for i in range(rings):
        for j in range(segments):
            a = i * (segments + 1) + j
            b = a + 1
            c = (i + 1) * (segments + 1) + j
            d = c + 1
            if i != 0:
                indices.extend([a, c, b])
            if i != rings - 1:
                indices.extend([b, c, d])
    return Primitive(verts, normals, indices, material, uvs)


def torus_primitive(major: float, minor: float, material: int, segments: int = 128, tube: int = 6) -> Primitive:
    verts = []
    normals = []
    uvs = []
    indices = []
    for i in range(segments):
        phi = math.tau * i / segments
        cp, sp = math.cos(phi), math.sin(phi)
        for j in range(tube):
            theta = math.tau * j / tube
            ct, st = math.cos(theta), math.sin(theta)
            verts.append(((major + minor * ct) * cp, (major + minor * ct) * sp, minor * st))
            normals.append((ct * cp, ct * sp, st))
            uvs.append((i / segments, j / tube))
    for i in range(segments):
        for j in range(tube):
            a = i * tube + j
            b = ((i + 1) % segments) * tube + j
            c = i * tube + (j + 1) % tube
            d = ((i + 1) % segments) * tube + (j + 1) % tube
            indices.extend([a, b, c, c, b, d])
    return Primitive(verts, normals, indices, material, uvs)


def annulus_primitive(inner: float, outer: float, material: int, segments: int = 128) -> Primitive:
    verts = []
    normals = []
    uvs = []
    indices = []
    for i in range(segments):
        phi = math.tau * i / segments
        cp, sp = math.cos(phi), math.sin(phi)
        verts.append((inner * cp, inner * sp, 0.0))
        verts.append((outer * cp, outer * sp, 0.0))
        normals.extend([(0.0, 0.0, 1.0), (0.0, 0.0, 1.0)])
        uvs.extend([(i / segments, 0.0), (i / segments, 1.0)])
    for i in range(segments):
        a = i * 2
        b = ((i + 1) % segments) * 2
        indices.extend([a, b, a + 1, a + 1, b, b + 1])
    return Primitive(verts, normals, indices, material, uvs)


def label_plane(width: float, height: float, material: int) -> Primitive:
    w, h = width * 0.5, height * 0.5
    return Primitive(
        [(-w, 0.0, -h), (w, 0.0, -h), (-w, 0.0, h), (w, 0.0, h)],
        [(0.0, -1.0, 0.0)] * 4,
        [0, 2, 1, 1, 2, 3],
        material,
        [(0.0, 1.0), (1.0, 1.0), (0.0, 0.0), (1.0, 0.0)],
    )


def build_scene() -> GlbBuilder:
    b = GlbBuilder()
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)

    surface_names = ["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "moon"]
    texture_ids = {name: b.add_image_texture(planet_texture(name), f"{name.title()}_Surface") for name in surface_names}
    saturn_ring_tex = b.add_image_texture(ring_texture("saturn"), "Saturn_Ring_Texture")

    label_paths = {
        "sun": TEXTURE_DIR / "label_sun_ja.png",
        "mercury": TEXTURE_DIR / "label_mercury_ja.png",
        "venus": TEXTURE_DIR / "label_venus_ja.png",
        "earth": TEXTURE_DIR / "label_earth_ja.png",
        "mars": TEXTURE_DIR / "label_mars_ja.png",
        "jupiter": TEXTURE_DIR / "label_jupiter_ja.png",
        "saturn": TEXTURE_DIR / "label_saturn_ja.png",
        "uranus": TEXTURE_DIR / "label_uranus_ja.png",
        "neptune": TEXTURE_DIR / "label_neptune_ja.png",
    }
    missing = [path for path in label_paths.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Japanese label PNGs are missing. Run tools/generate_japanese_labels.ps1 first.")
    label_tex = {name: b.add_image_texture(path, f"Label_{name.title()}_Japanese") for name, path in label_paths.items()}

    mat_sun = b.material("Sun_Emissive_Textured", (1.0, 1.0, 1.0, 1.0), texture=texture_ids["sun"], emissive=(0.9, 0.45, 0.08), roughness=0.55)
    planet_mats = {
        name: b.material(f"{name.title()}_Textured", (1.0, 1.0, 1.0, 1.0), texture=texture_ids[name], roughness=0.82)
        for name in surface_names
        if name != "sun"
    }
    mat_saturn_ring = b.material(
        "Saturn_Ring_Textured_Translucent",
        (1.0, 1.0, 1.0, 0.75),
        texture=saturn_ring_tex,
        alpha="BLEND",
        double_sided=True,
        roughness=0.9,
    )
    mat_orbit = b.material("Orbit_Ring_Light_Gray", (0.78, 0.82, 0.88, 0.34), alpha="BLEND", double_sided=True)
    label_mats = {
        name: b.material(
            f"Label_{name.title()}_Japanese_Material",
            (1.0, 1.0, 1.0, 1.0),
            texture=tex,
            alpha="BLEND",
            double_sided=True,
            emissive=(0.75, 0.75, 0.75),
        )
        for name, tex in label_tex.items()
    }

    planet_specs = [
        ("Mercury", "mercury", 2.2, 0.16, 7.0, (2.2, -0.55, 0.48), 0.48),
        ("Venus", "venus", 3.2, 0.26, 9.0, (3.2, -0.82, 0.60), 0.44),
        ("Earth", "earth", 4.4, 0.28, 10.0, (4.4, -0.62, 0.74), 0.44),
        ("Mars", "mars", 5.5, 0.20, 11.0, (5.5, -0.82, 0.52), 0.44),
        ("Jupiter", "jupiter", 7.2, 0.72, 16.0, (7.2, -1.28, 1.12), 0.58),
        ("Saturn", "saturn", 9.1, 0.62, 19.0, (9.1, -1.42, 1.00), 0.54),
        ("Uranus", "uranus", 10.8, 0.42, 22.0, (10.8, -1.02, 0.82), 0.52),
        ("Neptune", "neptune", 12.3, 0.40, 25.0, (12.3, -1.06, 0.78), 0.54),
    ]

    orbit_mesh = b.mesh("Orbit_Rings_Mesh", [torus_primitive(dist, 0.008, mat_orbit) for _, _, dist, _, _, _, _ in planet_specs])
    orbit_node = b.node("Orbit_Rings", mesh=orbit_mesh)

    sun_mesh = b.mesh("Sun_Mesh", [sphere_primitive(1.25, 48, 24, mat_sun)])
    sun_node = b.node("Sun", mesh=sun_mesh)

    label_nodes: list[int] = []
    sun_label_mesh = b.mesh("Label_Sun_Japanese_Mesh", [label_plane(0.78, 0.26, label_mats["sun"])])
    label_nodes.append(b.node("Label_Sun_Japanese", mesh=sun_label_mesh, translation=(0.0, -1.66, 1.66)))

    planet_control_nodes: list[int] = []
    for english, key, dist, radius, orbit_seconds, label_pos, label_w in planet_specs:
        segments = 48 if radius >= 0.6 else 32
        rings = 24 if radius >= 0.6 else 16
        planet_mesh = b.mesh(f"{english}_Mesh", [sphere_primitive(radius, segments, rings, planet_mats[key])])
        planet_node = b.node(english, mesh=planet_mesh, translation=(dist, 0.0, 0.0))

        if english == "Earth":
            moon_orbit_mesh = b.mesh("Moon_Orbit_Ring_Mesh", [torus_primitive(0.55, 0.004, mat_orbit, segments=64, tube=4)])
            moon_mesh = b.mesh("Moon_Mesh", [sphere_primitive(0.08, 20, 10, planet_mats["moon"])])
            moon_node = b.node("Moon", mesh=moon_mesh, translation=(0.55, 0.0, 0.0))
            moon_control = b.node("Moon_Orbit_Control", children=[moon_node])
            moon_orbit_node = b.node("Moon_Orbit_Ring", mesh=moon_orbit_mesh)
            b.nodes[planet_node].setdefault("children", []).extend([moon_control, moon_orbit_node])
            b.add_rotation_animation(moon_control, "Moon_Orbit", 4.0, "z")
        if english == "Saturn":
            ring_mesh = b.mesh("Saturn_Ring_Mesh", [annulus_primitive(0.82, 1.34, mat_saturn_ring)])
            ring_node = b.node("Saturn_Rings", mesh=ring_mesh, rotation=quat_y(24.0))
            b.nodes[planet_node].setdefault("children", []).append(ring_node)

        label_mesh = b.mesh(f"Label_{english}_Japanese_Mesh", [label_plane(label_w, 0.22, label_mats[key])])
        label_nodes.append(b.node(f"Label_{english}_Japanese", mesh=label_mesh, translation=label_pos))

        control = b.node(f"{english}_Orbit_Control", children=[planet_node])
        planet_control_nodes.append(control)
        b.add_rotation_animation(control, f"{english}_Orbit", orbit_seconds, "z")
        b.add_rotation_animation(planet_node, f"{english}_Spin", max(2.6, radius * 5.5), "z")

    labels_node = b.node("Labels_Japanese", children=label_nodes)
    solar_system_node = b.node("Solar_System", children=[sun_node, orbit_node, labels_node, *planet_control_nodes], rotation=quat_x(0))
    b.scene_nodes = [solar_system_node]  # type: ignore[attr-defined]
    return b


def main() -> None:
    builder = build_scene()
    builder.write(OUT_GLB, builder.scene_nodes)  # type: ignore[attr-defined]
    print(f"Wrote {OUT_GLB}")


if __name__ == "__main__":
    main()
