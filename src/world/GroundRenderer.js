import { TILE, terrainKindAt } from './layout.js'

const CHUNK = 512

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function speckle(ctx, n, hMin, hMax, sMin, sMax, lMin, lMax) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(Math.random() * TILE)
    const y = Math.floor(Math.random() * TILE)
    const h = hMin + Math.random() * (hMax - hMin)
    const s = sMin + Math.random() * (sMax - sMin)
    const l = lMin + Math.random() * (lMax - lMin)
    ctx.fillStyle = `hsl(${h},${s}%,${l}%)`
    ctx.fillRect(x, y, 1 + Math.floor(Math.random() * 2), 1)
  }
}

const PAINTERS = {
  grass: (ctx, hue) => {
    ctx.fillStyle = `hsl(${hue},42%,30%)`
    ctx.fillRect(0, 0, TILE, TILE)
    speckle(ctx, 46, hue - 12, hue + 14, 34, 56, 24, 40)
    ctx.fillStyle = `hsl(${hue + 6},48%,38%)`
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(Math.floor(Math.random() * TILE), Math.floor(Math.random() * TILE), 1, 2)
    }
  },
  dirt: (ctx, hue) => {
    ctx.fillStyle = `hsl(${hue},32%,54%)`
    ctx.fillRect(0, 0, TILE, TILE)
    speckle(ctx, 60, hue - 6, hue + 8, 26, 44, 42, 64)
    ctx.fillStyle = 'rgba(120,104,88,0.45)'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(Math.floor(Math.random() * (TILE - 3)), Math.floor(Math.random() * TILE), 2, 1)
    }
  },
  road: (ctx, hue) => {
    ctx.fillStyle = `hsl(${hue},30%,58%)`
    ctx.fillRect(0, 0, TILE, TILE)
    speckle(ctx, 54, hue - 6, hue + 8, 22, 40, 46, 66)
    ctx.fillStyle = 'rgba(96,80,62,0.22)'
    ctx.fillRect(3, 0, 2, TILE)
    ctx.fillRect(TILE - 5, 0, 2, TILE)
  },
  stone: (ctx) => {
    ctx.fillStyle = '#6f6f78'
    ctx.fillRect(0, 0, TILE, TILE)
    const stones = [
      [1, 1, 13, 11], [16, 0, 15, 12], [0, 14, 11, 12], [13, 14, 14, 13], [29, 13, 3, 12],
      [2, 28, 12, 4], [16, 29, 15, 3]
    ]
    for (const [sx, sy, sw, sh] of stones) {
      const g = 104 + Math.floor(Math.random() * 34)
      ctx.fillStyle = `rgb(${g},${g},${g + 6})`
      ctx.beginPath()
      ctx.roundRect(sx, sy, sw, sh, 3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(50,50,58,0.75)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  },
  water: (ctx, hue) => {
    ctx.fillStyle = `hsl(${hue},58%,44%)`
    ctx.fillRect(0, 0, TILE, TILE)
    speckle(ctx, 26, hue - 8, hue + 8, 45, 70, 38, 58)
    ctx.fillStyle = 'rgba(255,255,255,0.26)'
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(Math.floor(Math.random() * (TILE - 6)), Math.floor(Math.random() * TILE), 4, 1)
    }
  },
  bank: (ctx, hue) => {
    ctx.fillStyle = `hsl(${hue},26%,64%)`
    ctx.fillRect(0, 0, TILE, TILE)
    speckle(ctx, 44, hue - 8, hue + 8, 18, 34, 52, 74)
  },
  wall: (ctx) => {
    ctx.fillStyle = '#8d8f9a'
    ctx.fillRect(0, 0, TILE, TILE)
    for (let row = 0; row < 4; row++) {
      const off = row % 2 === 0 ? 0 : 8
      for (let col = -1; col < 3; col++) {
        const bx = col * 16 + off
        const by = row * 8
        const g = 128 + Math.floor(Math.random() * 26)
        ctx.fillStyle = `rgb(${g},${g},${g + 8})`
        ctx.fillRect(bx + 1, by + 1, 14, 6)
      }
    }
    ctx.fillStyle = 'rgba(40,40,48,0.35)'
    for (let row = 0; row < 4; row++) ctx.fillRect(0, row * 8 + 7, TILE, 1)
  },
  bridge: (ctx) => {
    ctx.fillStyle = '#7a5230'
    ctx.fillRect(0, 0, TILE, TILE)
    for (let i = 0; i < 4; i++) {
      const g = 132 + Math.floor(Math.random() * 26)
      ctx.fillStyle = `rgb(${g},${Math.floor(g * 0.72)},${Math.floor(g * 0.48)})`
      ctx.fillRect(0, i * 8 + 1, TILE, 6)
    }
    ctx.fillStyle = 'rgba(50,32,18,0.55)'
    ctx.fillRect(0, 0, 2, TILE)
    ctx.fillRect(TILE - 2, 0, 2, TILE)
  }
}

const RECIPES = {
  grass: [96, 112, 126],
  dirt: [30, 34],
  road: [32, 36],
  stone: [1],
  water: [200, 208],
  bank: [40],
  wall: [1],
  bridge: [1]
}

function buildTileSet() {
  const set = {}
  for (const kind of Object.keys(RECIPES)) {
    set[kind] = RECIPES[kind].map(hue => {
      const c = canvas(TILE, TILE)
      PAINTERS[kind](c.getContext('2d'), hue)
      return c
    })
  }
  return set
}

export class GroundRenderer {
  constructor(scene, map, poolSize = 44) {
    this.scene = scene
    this.map = map
    this.size = CHUNK
    this.set = buildTileSet()
    this.slots = []
    this.index = new Map()
    this.sig = ''

    for (let i = 0; i < poolSize; i++) {
      const key = `ground_chunk_${i}`
      const tex = scene.textures.createCanvas(key, CHUNK, CHUNK)
      const img = scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000)
      img.setVisible(false)
      this.slots.push({ img, tex, canvas: tex.getCanvas(), chunk: null })
    }
  }

  sample(wx, wy) {
    return terrainKindAt(this.map, wx, wy)
  }

  pick(kind, tx, ty) {
    const list = this.set[kind] || this.set.grass
    return list[Math.floor(hash2(tx, ty) * list.length) % list.length]
  }

  paint(slot, chunkKey) {
    const [cx, cy] = chunkKey.split(',')
    const ox = +cx * CHUNK
    const oy = +cy * CHUNK
    const ctx = slot.canvas.getContext('2d')
    ctx.clearRect(0, 0, CHUNK, CHUNK)

    const x0 = Math.floor(ox / TILE)
    const y0 = Math.floor(oy / TILE)
    const x1 = Math.ceil((ox + CHUNK) / TILE)
    const y1 = Math.ceil((oy + CHUNK) / TILE)

    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const wx = tx * TILE + TILE / 2
        const wy = ty * TILE + TILE / 2
        const kind = this.sample(wx, wy)
        const dx = tx * TILE - ox
        const dy = ty * TILE - oy

        if (kind === 'void') {
          ctx.fillStyle = '#101a12'
          ctx.fillRect(dx, dy, TILE, TILE)
          continue
        }

        ctx.drawImage(this.pick(kind, tx, ty), dx, dy, TILE, TILE)
        if (kind === 'wall') this.drawMerlons(ctx, tx, ty, dx, dy)
      }
    }

    slot.tex.refresh()
    slot.img.setPosition(ox, oy).setVisible(true)
    slot.chunk = chunkKey
  }

  drawMerlons(ctx, tx, ty, dx, dy) {
    const t = TILE
    const north = this.sample((tx * t) + t / 2, (ty - 1) * t + t / 2)
    const south = this.sample((tx * t) + t / 2, (ty + 1) * t + t / 2)
    const west = this.sample((tx - 1) * t + t / 2, (ty * t) + t / 2)
    const east = this.sample((tx + 1) * t + t / 2, (ty * t) + t / 2)
    const open = k => k === 'water' || k === 'bank'

    ctx.fillStyle = '#c3c6d2'
    for (let i = 0; i < 4; i++) {
      if (open(north)) ctx.fillRect(dx + i * 8 + 1, dy, 6, 9)
      if (open(south)) ctx.fillRect(dx + i * 8 + 1, dy + t - 9, 6, 9)
      if (open(west)) ctx.fillRect(dx, dy + i * 8 + 1, 9, 6)
      if (open(east)) ctx.fillRect(dx + t - 9, dy + i * 8 + 1, 9, 6)
    }
    ctx.fillStyle = 'rgba(30,30,38,0.22)'
    if (open(north)) ctx.fillRect(dx, dy + 8, t, 1)
    if (open(south)) ctx.fillRect(dx, dy + t - 10, t, 1)
    if (open(west)) ctx.fillRect(dx + 8, dy, 1, t)
    if (open(east)) ctx.fillRect(dx + t - 10, dy, 1, t)
  }

  refresh(camera) {
    const view = camera.worldView
    const cols = Math.ceil(this.map.worldW / CHUNK)
    const rows = Math.ceil(this.map.worldH / CHUNK)
    const minX = Math.max(0, Math.floor((view.x - CHUNK) / CHUNK))
    const maxX = Math.min(cols - 1, Math.floor((view.right + CHUNK) / CHUNK))
    const minY = Math.max(0, Math.floor((view.y - CHUNK) / CHUNK))
    const maxY = Math.min(rows - 1, Math.floor((view.bottom + CHUNK) / CHUNK))

    const want = []
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) want.push(`${cx},${cy}`)
    }

    const sig = want.join('|')
    if (sig === this.sig) return
    this.sig = sig

    const wantSet = new Set(want)
    for (const [key, slot] of [...this.index]) {
      if (!wantSet.has(key)) {
        slot.chunk = null
        slot.img.setVisible(false)
        this.index.delete(key)
      }
    }

    for (const key of want) {
      if (this.index.has(key)) continue
      const slot = this.slots.find(s => s.chunk === null)
      if (!slot) break
      this.paint(slot, key)
      this.index.set(key, slot)
    }
  }
}
