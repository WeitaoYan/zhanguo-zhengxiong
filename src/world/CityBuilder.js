import {
  innerRect, mansionPos, gateInfo, towerSpots, wallSegments, moatSegments,
  MANSION_BODY, GATE_SIDES, WORLD_W, WORLD_H
} from './layout.js'
import { ALL_CITY_CONTENT } from '../data/cityContent.js'
import { CITIES } from '../data/cities.js'
import { levelOf, MAX_LEVEL } from '../data/military.js'

const HOUSE_BODY = { w: 78, h: 56 }
const TOWER_BODY = { w: 54, h: 68 }
const BARRIER = { w: 96, h: 22 }
const BARRACK_BODY = { w: 76, h: 62 }

export const BARRACK_CN = {
  infantry: '步兵营',
  cavalry: '骑兵营',
  armory: '军械库'
}

const COLLIDABLE_PROPS = {
  crate: { w: 20, h: 20, dy: 0 },
  obj_barrel: { w: 14, h: 20, dy: 0 },
  well: { w: 24, h: 36, dy: 14 },
  bush: { w: 16, h: 12, dy: 0 },
  tree_green: { w: 30, h: 20, dy: 12 },
  tree_green2: { w: 30, h: 20, dy: 12 },
  tree_green3: { w: 30, h: 20, dy: 12 }
}

export class CityBuilder {
  constructor(scene, ground) {
    this.scene = scene
    this.ground = ground
    this.solids = []
    this.npcs = []
    this.gates = []
    this.decor = []
    this.barracks = []
  }

  addSolid(x, y, w, h) {
    const body = this.scene.physics.add.staticBody(x - w / 2, y - h / 2, w, h)
    this.solids.push(body)
    return body
  }

  buildAll() {
    for (const city of CITIES) this.buildCity(city)
    this.scatterWild()
    return this
  }

  // 升级或占领后刷新军营星级和归属配色，让世界里的建筑和数据保持一致。
  refreshBarracks() {
    for (const bar of this.barracks) {
      const lv = levelOf(bar.city, bar.key)
      const maxed = lv >= MAX_LEVEL
      bar.badge.setText(`${'★'.repeat(lv)}${maxed ? '' : '☆'.repeat(MAX_LEVEL - lv)}`)
      bar.badge.setColor(maxed ? '#ffd45e' : bar.city.owner === 'player' ? '#cfe0f0' : '#9aa4ae')
      bar.img.setTint(bar.city.owner === 'player' ? 0xffffff : 0x9aa8b4)
      // 军械库底下再挂一行神机营：这是它旗下新增的编制改良，
      // 不进面板也该在城里看得见自己练到几级了。
      if (bar.corpsBadge) {
        bar.corpsBadge.setText(`神机营 Lv${levelOf(bar.city, 'corps')}`)
      }
    }
  }

  buildCity(city) {
    const scene = this.scene
    const r = innerRect(city)
    const content = ALL_CITY_CONTENT[city.id]
    const tint = city.color

    // 城墙与护城河：只做碰撞，视觉由分块地面绘制
    for (const s of wallSegments(city)) this.addSolid(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h)
    for (const s of moatSegments(city)) this.addSolid(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h)

    // 四角角楼
    for (const t of towerSpots(city)) {
      const img = scene.add.image(t.x, t.y, 'tower').setOrigin(0.5, 1).setDepth(4)
      img.setTint(tint)
      this.addSolid(t.x, t.y - TOWER_BODY.h / 2, TOWER_BODY.w, TOWER_BODY.h)
      this.decor.push(img)
    }

    // 城门、吊桥、门旗
    for (const side of GATE_SIDES) {
      const g = gateInfo(city, side)
      const gatehouse = scene.add.image(g.wall.x, g.wall.y, 'gatehouse').setOrigin(0.5, 0.5).setDepth(4)
      gatehouse.setTint(tint)
      this.decor.push(gatehouse)

      const bridge = scene.add.image(g.moat.x, g.moat.y, 'bridge').setOrigin(0.5, 0.5).setDepth(2)
      this.decor.push(bridge)

      const flag = scene.add.image(
        g.moat.x + (side === 'n' || side === 's' ? 62 : 0),
        g.moat.y + (side === 'w' || side === 'e' ? 58 : -46),
        'flag'
      ).setOrigin(0.5, 0.5).setDepth(5)
      flag.setTint(tint)
      this.decor.push(flag)

      // 守卫站在城门内侧
      const inward = {
        n: { x: 0, y: 54 }, s: { x: 0, y: -54 }, w: { x: 54, y: 0 }, e: { x: -54, y: 0 }
      }[side]
      const guardX = g.inner.x + inward.x
      const guardY = g.inner.y + inward.y
      const guard = scene.physics.add.sprite(guardX, guardY, 'npc_guard_down_0')
      guard.setDepth(3)
      guard.body.setSize(16, 20)
      guard.body.setOffset(8, 24)
      guard.setImmovable(true)
      guard.npcData = {
        key: 'guard',
        name: `${city.name}${sideName(side)}守卫`,
        lines: []
      }
      guard.npcKey = 'guard'
      guard.npcDir = facing(side)
      guard.npcFrame = 0
      guard.isMoving = false
      guard.gateCity = city
      guard.gateSide = side
      this.npcs.push(guard)

      const gate = {
        city,
        side,
        x: g.moat.x,
        y: g.moat.y,
        guard,
        barrier: null,
        barrierBody: null
      }
      this.gates.push(gate)
      this.applyGateState(gate)
    }

    // 城主府
    const m = mansionPos(city)
    const mansion = scene.add.image(m.x, m.y, 'mansion')
      .setOrigin(0.5, 0.5).setDepth(4)
    mansion.setTint(tint)
    this.addSolid(m.x, m.y, MANSION_BODY.w, MANSION_BODY.h)
    this.decor.push(mansion)

    const plaque = scene.add.text(m.x, m.y + 24, city.name, {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(6)
    this.decor.push(plaque)

    // 民居
    for (const h of content.houses) {
      const x = r.x + h.x
      const y = r.y + h.y
      const house = scene.add.image(x, y, `house_${h.v % 3}`).setOrigin(0.5, 1).setDepth(4)
      this.addSolid(x, y - HOUSE_BODY.h / 2, HOUSE_BODY.w, HOUSE_BODY.h)
      this.decor.push(house)
    }

    // 摊位
    for (const s of content.shops) {
      const x = r.x + s.x
      const y = r.y + s.y
      const stall = scene.add.image(x, y, `stall_${s.type}`).setDepth(4)
      this.addSolid(x, y, 74, 40)
      this.decor.push(stall)
      const label = scene.add.text(x, y - 40, s.name, {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(6)
      this.decor.push(label)
    }

    // 军营：等级牌直接标在建筑上，进城一眼就知道自家兵营几级
    for (const b of content.barracks) {
      const x = r.x + b.x
      const y = r.y + b.y
      const img = scene.add.image(x, y, `barracks_${b.key}`).setOrigin(0.5, 1).setDepth(4)
      this.addSolid(x, y - BARRACK_BODY.h / 2, BARRACK_BODY.w, BARRACK_BODY.h)
      this.decor.push(img)

      const lv = levelOf(city, b.key)
      const name = scene.add.text(x, y - 92, BARRACK_CN[b.key], {
        fontSize: '13px',
        fontFamily: 'Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(6)
      this.decor.push(name)

      // 星级代替数字：低等级一眼可辨，满级用金色
      const maxed = lv >= MAX_LEVEL
      const badge = scene.add.text(x, y - 74, `${'★'.repeat(lv)}${maxed ? '' : '☆'.repeat(MAX_LEVEL - lv)}`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: maxed ? '#ffd45e' : '#cfe0f0',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(6)
      this.decor.push(badge)

      // 军械库额外挂一行神机营
      let corpsBadge = null
      if (b.key === 'armory') {
        corpsBadge = scene.add.text(x, y - 60, `神机营 Lv${levelOf(city, 'corps')}`, {
          fontSize: '11px',
          fontFamily: 'Arial',
          color: '#ffd48a',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(6)
        this.decor.push(corpsBadge)
      }

      this.barracks.push({ city, key: b.key, x, y: y - BARRACK_BODY.h / 2, name, badge, corpsBadge, img })
    }

    // 道具
    for (const p of content.props) {
      const x = r.x + p.x
      const y = r.y + p.y
      const depth = p.key.startsWith('tree') ? 4 : 3
      const img = scene.add.image(x, y, p.key).setDepth(depth)
      this.decor.push(img)
      const c = COLLIDABLE_PROPS[p.key]
      if (c) this.addSolid(x, y + c.dy, c.w, c.h)
    }

    // NPC
    const push = (d, extra = {}) => {
      const npc = scene.physics.add.sprite(r.x + d.x, r.y + d.y, `npc_${d.key}_down_0`)
      npc.setDepth(3)
      npc.body.setSize(16, 20)
      npc.body.setOffset(8, 24)
      npc.setImmovable(true)
      npc.npcData = { key: d.key, name: d.name, lines: d.lines }
      npc.npcKey = d.key
      npc.npcDir = 'down'
      npc.npcFrame = 0
      npc.isMoving = false
      npc.wander = !!d.wander
      npc.moveTimer = 0
      npc.idleTimer = 30 + ((d.x * 7 + d.y * 13) % 60)
      npc.moveDir = { x: 0, y: 1 }
      npc.homeX = r.x + d.x
      npc.homeY = r.y + d.y
      Object.assign(npc, extra)
      this.npcs.push(npc)
      return npc
    }

    for (const d of content.shopNpcs) push(d)
    for (const d of content.villagers) push(d)
    for (const d of content.extras) push(d)
    if (content.steward) push(content.steward)
    if (content.lord) push(content.lord, { isLord: true })
  }

  // 城门状态跟着归属走：敌城落闸拦人，自己的城四门洞开。
  // 玩家攻城、或被 NPC 夺城之后都靠这个方法把世界刷新回一致状态。
  applyGateState(gate) {
    const isPlayer = gate.city.owner === 'player'
    if (isPlayer) {
      if (gate.barrierBody) {
        const idx = this.solids.indexOf(gate.barrierBody)
        if (idx >= 0) this.solids.splice(idx, 1)
        gate.barrierBody.destroy()
        gate.barrierBody = null
      }
      if (gate.barrier) {
        gate.barrier.destroy()
        gate.barrier = null
      }
      gate.guard.setVisible(false)
      gate.guard.body.enable = false
      return
    }

    if (!gate.barrier) {
      const g = gateInfo(gate.city, gate.side)
      gate.barrier = this.scene.add.image(g.wall.x, g.wall.y, 'portcullis')
        .setOrigin(0.5, 0.5).setDepth(5)
      gate.barrierBody = this.addSolid(g.wall.x, g.wall.y, BARRIER.w, BARRIER.h)
    }
    gate.guard.setVisible(true)
    gate.guard.body.enable = true
  }

  // 荒野植被：只长在 sample() 判定为草地的地方，自动避开道路/城池/湖泊
  scatterWild() {
    const scene = this.scene
    const step = 150
    const map = this.ground.map
    const kinds = ['tree_green', 'tree_green2', 'tree_green3', 'bush', 'rock', 'flower_pink', 'flower_blue']

    for (let y = step; y < WORLD_H; y += step) {
      for (let x = step; x < WORLD_W; x += step) {
        const h = hash2(x, y)
        const wx = x + (h * 2 - 1) * (step * 0.42)
        const wy = y + (hash2(y, x) * 2 - 1) * (step * 0.42)
        if (this.ground.sample(wx, wy) !== 'grass') continue

        const dense = map.forests.some(f =>
          wx >= f.x && wx <= f.x + f.w && wy >= f.y && wy <= f.y + f.h)
        if (hash2(wx | 0, wy | 0) > (dense ? 0.72 : 0.3)) continue

        const kind = kinds[Math.floor(hash2(wx, wy + 7) * kinds.length) % kinds.length]
        const img = scene.add.image(wx, wy, kind).setDepth(1)
        img.setScale(0.9 + hash2(wy, wx) * 0.35)
        if (kind.startsWith('tree')) {
          img.setOrigin(0.5, 0.82)
          const c = COLLIDABLE_PROPS[kind]
          this.addSolid(wx, wy + 6, c.w * 0.7, c.h * 0.7)
        }
        this.decor.push(img)
      }
    }
  }
}

function sideName(side) {
  return { n: '北', s: '南', w: '西', e: '东' }[side]
}

function facing(side) {
  if (side === 'n') return 'down'
  if (side === 's') return 'up'
  if (side === 'w') return 'right'
  return 'left'
}

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
