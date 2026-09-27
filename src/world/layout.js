import { CITIES } from '../data/cities.js'

export const TILE = 32

// 每座城的内部尺寸与原版世界一致（1600x1200），外面加城墙与护城河。
export const CITY_W = 1600
export const CITY_H = 1200
export const WALL_T = 48
export const MOAT_W = 56
export const PAD = WALL_T + MOAT_W
export const GATE_W = 96
export const RING = 64

export const COLS = 3
export const ROWS = 3
export const MARGIN = 320
export const STEP_X = CITY_W + 2 * PAD + 760
export const STEP_Y = CITY_H + 2 * PAD + 760
export const WORLD_W = MARGIN * 2 + (COLS - 1) * STEP_X + CITY_W + 2 * PAD
export const WORLD_H = MARGIN * 2 + (ROWS - 1) * STEP_Y + CITY_H + 2 * PAD

// 城内固定结构（相对城内左上角）
export const PLAZA = { x: 480, y: 320, w: 640, h: 560 }
export const MANSION = { x: 820, y: 640 }
export const MANSION_BODY = { w: 140, h: 110 }

export const GATE_SIDES = ['n', 's', 'w', 'e']

const rect = (x, y, w, h) => ({ x, y, w, h })

export function cellOrigin(col, row) {
  return { x: MARGIN + col * STEP_X + PAD, y: MARGIN + row * STEP_Y + PAD }
}

export function innerRect(city) {
  const o = cellOrigin(city.col, city.row)
  return rect(o.x, o.y, CITY_W, CITY_H)
}

// 含城墙与护城河的外框
export function cityBox(city) {
  const r = innerRect(city)
  return rect(r.x - PAD, r.y - PAD, r.w + 2 * PAD, r.h + 2 * PAD)
}

export function plazaRect(city) {
  const r = innerRect(city)
  return rect(r.x + PLAZA.x, r.y + PLAZA.y, PLAZA.w, PLAZA.h)
}

export function mansionPos(city) {
  const r = innerRect(city)
  return { x: r.x + MANSION.x, y: r.y + MANSION.y }
}

export function gateInfo(city, side) {
  const r = innerRect(city)
  const gx = r.x + r.w / 2
  const gy = r.y + r.h / 2
  return {
    side,
    inner: {
      n: { x: gx, y: r.y },
      s: { x: gx, y: r.y + r.h },
      w: { x: r.x, y: gy },
      e: { x: r.x + r.w, y: gy }
    }[side],
    wall: {
      n: { x: gx, y: r.y - WALL_T / 2 },
      s: { x: gx, y: r.y + r.h + WALL_T / 2 },
      w: { x: r.x - WALL_T / 2, y: gy },
      e: { x: r.x + r.w + WALL_T / 2, y: gy }
    }[side],
    moat: {
      n: { x: gx, y: r.y - WALL_T - MOAT_W / 2 },
      s: { x: gx, y: r.y + r.h + WALL_T + MOAT_W / 2 },
      w: { x: r.x - WALL_T - MOAT_W / 2, y: gy },
      e: { x: r.x + r.w + WALL_T + MOAT_W / 2, y: gy }
    }[side]
  }
}

export function towerSpots(city) {
  const r = innerRect(city)
  const o = WALL_T / 2
  return [
    { x: r.x - o, y: r.y - o },
    { x: r.x + r.w + o, y: r.y - o },
    { x: r.x - o, y: r.y + r.h + o },
    { x: r.x + r.w + o, y: r.y + r.h + o }
  ]
}

// 城墙拆成 8 段，四面各留一个 GATE_W 宽的门洞
export function wallSegments(city) {
  const r = innerRect(city)
  const L = r.x
  const T = r.y
  const R = r.x + r.w
  const B = r.y + r.h
  const gx = L + r.w / 2
  const gy = T + r.h / 2
  const runH = (r.w - GATE_W) / 2 + WALL_T
  const runV = (r.h - GATE_W) / 2 + WALL_T
  return [
    rect(L - WALL_T, T - WALL_T, runH, WALL_T),
    rect(gx + GATE_W / 2, T - WALL_T, runH, WALL_T),
    rect(L - WALL_T, B, runH, WALL_T),
    rect(gx + GATE_W / 2, B, runH, WALL_T),
    rect(L - WALL_T, T - WALL_T, WALL_T, runV),
    rect(L - WALL_T, gy + GATE_W / 2, WALL_T, runV),
    rect(R, T - WALL_T, WALL_T, runV),
    rect(R, gy + GATE_W / 2, WALL_T, runV)
  ]
}

// 护城河同样是 8 段（门洞处断开）。outer 指向城外一侧，采样时用它区分水与岸。
export function moatSegments(city) {
  const r = innerRect(city)
  const L = r.x
  const T = r.y
  const R = r.x + r.w
  const B = r.y + r.h
  const gx = L + r.w / 2
  const gy = T + r.h / 2
  const runH = (r.w - GATE_W) / 2 + PAD
  const runV = (r.h - GATE_W) / 2 + PAD
  const o = { n: 'top', s: 'bottom', w: 'left', e: 'right' }
  return [
    { ...rect(L - PAD, T - PAD, runH, MOAT_W), outer: o.n },
    { ...rect(gx + GATE_W / 2, T - PAD, runH, MOAT_W), outer: o.n },
    { ...rect(L - PAD, B + WALL_T, runH, MOAT_W), outer: o.s },
    { ...rect(gx + GATE_W / 2, B + WALL_T, runH, MOAT_W), outer: o.s },
    { ...rect(L - PAD, T - PAD, MOAT_W, runV), outer: o.w },
    { ...rect(L - PAD, gy + GATE_W / 2, MOAT_W, runV), outer: o.w },
    { ...rect(R + WALL_T, T - PAD, MOAT_W, runV), outer: o.e },
    { ...rect(R + WALL_T, gy + GATE_W / 2, MOAT_W, runV), outer: o.e }
  ]
}

// 城外官道：3x3 全网格都铺，因此两处荒野格也有路穿过。
// 每段要从 A 的护城河外缘一直铺到 B 的城墙外缘，
// 这样正好盖住两侧的护城河桥洞（渲染时 road 优先于 moat → 画成桥面）。
export function outerRoads() {
  const out = []
  const reach = STEP_X + MOAT_W
  const reachY = STEP_Y + MOAT_W
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS - 1; col++) {
      const a = cellOrigin(col, row)
      const b = cellOrigin(col + 1, row)
      out.push(rect(a.x - PAD, a.y + CITY_H / 2 - GATE_W / 2, reach, GATE_W))
    }
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS - 1; row++) {
      const a = cellOrigin(col, row)
      out.push(rect(a.x + CITY_W / 2 - GATE_W / 2, a.y - PAD, GATE_W, reachY))
    }
  }
  return out
}

// 城内沿墙环路 + 四条通往市集的支路
export function innerRoads(city) {
  const r = innerRect(city)
  const t = RING
  const cy = r.y + CITY_H / 2 - t / 2
  const cx = r.x + CITY_W / 2 - t / 2
  return [
    rect(r.x, r.y, r.w, t),
    rect(r.x, r.y + r.h - t, r.w, t),
    rect(r.x, r.y + t, t, r.h - 2 * t),
    rect(r.x + r.w - t, r.y + t, t, r.h - 2 * t),
    rect(r.x + t, cy, PLAZA.x - t, t),
    rect(r.x + PLAZA.x + PLAZA.w, cy, r.w - t - PLAZA.x - PLAZA.w, t),
    rect(cx, r.y + t, t, PLAZA.y - t),
    rect(cx, r.y + PLAZA.y + PLAZA.h, t, r.h - t - PLAZA.y - PLAZA.h)
  ]
}

// ---- 荒野地貌 ----
// 九城填满 3x3 之后已经没有空闲的格子，旷野只剩下城与城之间的空档。
// 官道正好从每段空档正中穿过，所以先把空档按官道切成两半，
// 湖泊与树林只落在切出来的地块里——绝不压住官道，路永远是通的。

export const GAP = STEP_X - CITY_W - 2 * PAD

export function wildPatches() {
  const boxW = CITY_W + 2 * PAD
  const boxH = CITY_H + 2 * PAD
  const roadPad = GATE_W / 2 + 26    // 官道半宽 + 一点余量
  const out = []

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const b = cityBox({ col, row })

      // 东侧空档：横向官道从这里穿过
      if (col < COLS - 1) {
        const x = b.x + boxW
        const mid = b.y + boxH / 2
        out.push(rect(x, b.y, GAP, mid - roadPad - b.y))
        out.push(rect(x, mid + roadPad, GAP, b.y + boxH - mid - roadPad))
      }

      // 南侧空档：纵向官道从这里穿过
      if (row < ROWS - 1) {
        const y = b.y + boxH
        const mid = b.x + boxW / 2
        out.push(rect(b.x, y, mid - roadPad - b.x, GAP))
        out.push(rect(mid + roadPad, y, b.x + boxW - mid - roadPad, GAP))
      }
    }
  }
  return out
}

function inset(r, d) {
  return rect(r.x + d, r.y + d, r.w - 2 * d, r.h - 2 * d)
}

// 每块旷野长湖还是长树由固定哈希决定：布局稳定，每次进游戏都一样
export function wildFeatures() {
  const lakes = []
  const forests = []
  wildPatches().forEach((p, i) => {
    const h = unitHash(i * 2654435761 + 1013904223)
    if (h < 0.36) lakes.push(inset(p, 74))
    else if (h < 0.74) forests.push(inset(p, 46))
  })
  return { lakes, forests }
}

function unitHash(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 2246822519)
  h = Math.imul(h ^ (h >>> 15), 3266489917)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

export function buildTerrainMap() {
  const wild = wildFeatures()
  return {
    worldW: WORLD_W,
    worldH: WORLD_H,
    roads: [...outerRoads(), ...CITIES.flatMap(c => innerRoads(c))],
    walls: CITIES.flatMap(wallSegments),
    moats: CITIES.flatMap(moatSegments),
    plazas: CITIES.map(plazaRect),
    inners: CITIES.map(innerRect),
    boxes: CITIES.map(cityBox),
    lakes: wild.lakes,
    forests: wild.forests
  }
}

export function cityAt(x, y) {
  return CITIES.find(c => {
    const r = innerRect(c)
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }) || null
}

export function contains(rects, x, y) {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true
  }
  return false
}

export function firstContaining(rects, x, y) {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r
  }
  return null
}

// 从 a 中挖去 b，返回剩余的至多 4 块矩形
export function subtractRect(a, b) {
  const x0 = Math.max(a.x, b.x)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y0 = Math.max(a.y, b.y)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  if (x0 >= x1 || y0 >= y1) return [a]

  const out = []
  if (a.y < y0) out.push(rect(a.x, a.y, a.w, y0 - a.y))
  if (y1 < a.y + a.h) out.push(rect(a.x, y1, a.w, a.y + a.h - y1))
  if (a.x < x0) out.push(rect(a.x, y0, x0 - a.x, y1 - y0))
  if (x1 < a.x + a.w) out.push(rect(x1, y0, a.x + a.w - x1, y1 - y0))
  return out.filter(p => p.w > 1 && p.h > 1)
}

// 湖泊碰撞体：挖掉官道，避免把穿过荒野的官道封死
export function lakeSolids(map) {
  const out = []
  for (const l of map.lakes) {
    let parts = [l]
    for (const r of map.roads) {
      const next = []
      for (const p of parts) next.push(...subtractRect(p, r))
      parts = next
      if (!parts.length) break
    }
    out.push(...parts)
  }
  return out
}

// 地形优先级：官道/桥 > 城墙 > 护城河 > 市集石地 > 城内土路 > 湖水 > 草地
export function terrainKindAt(map, wx, wy) {
  if (wx < 0 || wy < 0 || wx > map.worldW || wy > map.worldH) return 'void'

  if (contains(map.roads, wx, wy)) {
    return contains(map.moats, wx, wy) ? 'bridge' : 'road'
  }
  if (contains(map.walls, wx, wy)) return 'wall'

  const moat = firstContaining(map.moats, wx, wy)
  if (moat) {
    const half = MOAT_W / 2
    if (moat.outer === 'top') return wy >= moat.y + half ? 'water' : 'bank'
    if (moat.outer === 'bottom') return wy <= moat.y + moat.h - half ? 'water' : 'bank'
    if (moat.outer === 'left') return wx >= moat.x + half ? 'water' : 'bank'
    return wx <= moat.x + moat.w - half ? 'water' : 'bank'
  }

  if (contains(map.plazas, wx, wy)) return 'stone'
  if (contains(map.inners, wx, wy)) return 'dirt'
  if (contains(map.lakes, wx, wy)) return 'water'
  return 'grass'
}
