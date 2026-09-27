// 野外营寨的落点与表现。
//
// 落点不写死：从 layout 的"荒野空档"里挑地块，再在里面找一块确实是草地的落脚点
// （自动避开官道、湖泊、树林与城池），所以地形生成逻辑一变，营寨也跟着走。
// 等级按"离青禾城的远近"排：门口的窝是练手的，越往外越硬。
//
// 每个营寨在场景里由四件东西组成：营寨营地、怪物本体、名牌、战力牌。
// 荡平之后怪物与名牌撤掉，只留一块焦土，等计时结束再重新聚起（等级 +1）。

import { CITIES, CITY_BY_ID, CAPITAL_ID } from '../data/cities.js'
import { wildPatches, innerRect, terrainKindAt, cityBox, GATE_W } from './layout.js'
import {
  MONSTER_KINDS, MAX_CAMP_LEVEL, CAMP_RESPAWN_TICKS,
  monsterName, monsterPower, monsterReward
} from '../data/monsters.js'

const CAMP_MIN_GAP = 430          // 两个营寨之间的最小距离
const CAMP_INSET = 120            // 地块内缩，别贴着官道与城根
// 等级按"离青禾城多远"排：门口的窝是练手的（1 级狼群），
// 越往外越硬（5 级流寇营）。这两条阈值按本地图的实际尺寸标定：
// 最近的旷野空档约 1150，最远的约 3550，正好铺开 1~5 级。
const LEVEL_NEAR = 1100
const LEVEL_STEP = 620

// 各等级会出现的怪物：低等级只有狼与山贼，高等级才轮到黑熊与流寇
const TIER_KINDS = {
  1: ['wolf'],
  2: ['wolf', 'bandit'],
  3: ['bandit', 'boar'],
  4: ['boar', 'bear'],
  5: ['bear', 'rebel']
}

function rect(x, y, w, h) { return { x, y, w, h } }

function inset(r, d) {
  return rect(r.x + d, r.y + d, r.w - 2 * d, r.h - 2 * d)
}

function hash(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 2246822519)
  h = Math.imul(h ^ (h >>> 15), 3266489917)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

export class MonsterField {
  constructor(scene, map, builder) {
    this.scene = scene
    this.map = map
    this.builder = builder
    this.camps = []
  }

  get alive() {
    return this.camps.filter(c => c.alive)
  }

  // 关卡切换 / 重开：把旧营寨连同贴图与碰撞体一起清掉，再按新关卡重铺
  build(stage, boost = 1) {
    this.destroyAll()
    this.boost = boost
    this.stageTag = stage?.name || ''
    const spots = this.spots()
    spots.forEach((s, i) => {
      const level = this.levelAt(s.x, s.y)
      const camp = {
        id: `m${i + 1}`,
        kind: this.kindFor(level, i),
        level,
        x: s.x,
        y: s.y,
        boost,
        raid: true,          // 出兵面板据此切换成"讨伐"口径
        name: '',
        alive: true,
        respawn: 0,
        views: null,
        solid: null
      }
      this.camps.push(camp)
      this.spawn(camp)
    })
    return this
  }

  destroyAll() {
    for (const camp of this.camps) this.despawn(camp)
    this.camps = []
  }

  // ---- 落点 ----
  spots() {
    const patches = wildPatches()
    const out = []
    // 隔一块挑一块：营寨既不会挤在一起，也不会整片荒野空着
    for (let i = 0; i < patches.length; i += 2) {
      const inner = inset(patches[i], CAMP_INSET)
      if (inner.w < 120 || inner.h < 120) continue
      const p = this.findGrass(inner, out)
      if (p) out.push(p)
    }
    return out
  }

  findGrass(area, placed) {
    // 在候选地块里打一张网格，取第一块"确实是草地、又不挨着别的营寨"的点
    for (let ry = 0; ry < 5; ry++) {
      for (let rx = 0; rx < 5; rx++) {
        const x = area.x + area.w * (0.12 + rx * 0.19)
        const y = area.y + area.h * (0.12 + ry * 0.19)
        if (x < 80 || y < 80) continue
        if (terrainKindAt(this.map, x, y) !== 'grass') continue
        if (this.nearRoad(x, y)) continue
        if (placed.some(p => Math.hypot(p.x - x, p.y - y) < CAMP_MIN_GAP)) continue
        if (this.nearCity(x, y)) continue
        return { x, y }
      }
    }
    return null
  }

  // 官道两侧留出余量：营寨压在路面上会挡住通道，也会让"打怪"变成堵路
  nearRoad(x, y) {
    return this.map.roads.some(r =>
      x >= r.x - GATE_W / 2 && x <= r.x + r.w + GATE_W / 2 &&
      y >= r.y - GATE_W / 2 && y <= r.y + r.h + GATE_W / 2)
  }

  nearCity(x, y) {
    return CITIES.some(c => {
      const b = cityBox(c)
      return x >= b.x - 60 && x <= b.x + b.w + 60 && y >= b.y - 60 && y <= b.y + b.h + 60
    })
  }

  distTo(p, city) {
    const r = innerRect(city)
    return Math.hypot(p.x - (r.x + r.w / 2), p.y - (r.y + r.h / 2))
  }

  levelAt(x, y) {
    const capital = CITY_BY_ID[CAPITAL_ID]
    if (!capital) return 1
    const d = this.distTo({ x, y }, capital)
    return Math.max(1, Math.min(MAX_CAMP_LEVEL, 1 + Math.floor((d - LEVEL_NEAR) / LEVEL_STEP)))
  }

  kindFor(level, seed) {
    const list = TIER_KINDS[level] || TIER_KINDS[1]
    return list[Math.floor(hash(seed * 977 + 31) * list.length) % list.length]
  }

  // ---- 表现 ----
  spawn(camp) {
    const scene = this.scene
    camp.power = monsterPower(camp)
    camp.reward = monsterReward(camp)
    camp.name = monsterName(camp)
    camp.alive = true
    camp.respawn = 0

    const base = scene.add.image(camp.x, camp.y, 'monster_camp')
      .setOrigin(0.5, 0.82).setDepth(2)
    const body = scene.add.image(camp.x + 30, camp.y - 2, `monster_${camp.kind}`)
      .setOrigin(0.5, 0.9).setDepth(3)
    const name = scene.add.text(camp.x, camp.y - 74, monsterName(camp), {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd8a0',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6)
    const power = scene.add.text(camp.x, camp.y - 58, `寨防 ${camp.power}`, {
      fontSize: '11px', fontFamily: 'Arial', color: '#ffb4b4',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6)

    scene.tweens.add({
      targets: body, y: body.y - 3, duration: 820,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    })

    camp.views = { base, body, name, power }
    // 营寨挡人：不然玩家会直接站进火堆里
    camp.solid = this.builder.addSolid(camp.x, camp.y - 8, 46, 30)
  }

  despawn(camp) {
    if (!camp.views) return
    const v = camp.views
    this.scene.tweens.killTweensOf(v.body)
    // 荡平后的"焦土 + 已荡平"会把同一个对象放进多个槽位，去重后再销毁
    for (const obj of new Set([v.base, v.body, v.name, v.power])) {
      if (obj && obj.destroy) obj.destroy()
    }
    camp.views = null
    if (camp.solid) {
      const idx = this.builder.solids.indexOf(camp.solid)
      if (idx >= 0) this.builder.solids.splice(idx, 1)
      camp.solid.destroy()
      camp.solid = null
    }
  }

  // 讨伐胜利：营地被荡平，留下一块焦土，过一会儿再聚起更强的
  clear(camp) {
    if (!camp.alive) return
    this.despawn(camp)
    camp.alive = false
    camp.respawn = CAMP_RESPAWN_TICKS
    camp.level = Math.min(MAX_CAMP_LEVEL, camp.level + 1)

    const scene = this.scene
    const ash = scene.add.image(camp.x, camp.y - 4, 'monster_cleared')
      .setOrigin(0.5, 0.8).setDepth(1)
    const mark = scene.add.text(camp.x, camp.y - 30, '已荡平', {
      fontSize: '11px', fontFamily: 'Arial', color: '#9a9a9a',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6)
    camp.views = { base: ash, body: ash, name: mark, power: mark }
  }

  // 每 2 秒推进一步：倒计时结束就重新聚起（等级已在荡平时 +1）
  tick() {
    const events = []
    for (const camp of this.camps) {
      if (camp.alive) continue
      camp.respawn -= 1
      if (camp.respawn > 0) {
        if (camp.views?.name) camp.views.name.setText(`已荡平 ${camp.respawn * 2}s`)
        continue
      }
      this.despawn(camp)
      this.spawn(camp)
      events.push({ kind: 'respawn', camp })
    }
    return events
  }

  // 名字带"已荡平"的临时视图也算 views，这里只用来判断能否交互
  findNearest(x, y, range) {
    let best = null
    let bestDist = range
    for (const camp of this.camps) {
      if (!camp.alive) continue
      const d = Math.hypot(camp.x - x, camp.y - y)
      if (d < bestDist) { bestDist = d; best = camp }
    }
    return best
  }

  // 供 UI 显示：当前野外还有几处营寨
  aliveCount() {
    return this.camps.filter(c => c.alive).length
  }

  summary() {
    const kinds = {}
    for (const camp of this.camps) {
      if (!camp.alive) continue
      kinds[camp.kind] = (kinds[camp.kind] || 0) + 1
    }
    return Object.entries(kinds)
      .map(([k, n]) => `${MONSTER_KINDS[k].name}×${n}`)
      .join('　')
  }
}
