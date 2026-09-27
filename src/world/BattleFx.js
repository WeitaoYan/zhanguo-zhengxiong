// 攻城战的过场动画：在城门外演完「列阵 → 交锋 → 分出胜负」，
// 让玩家看清自己这一仗是怎么打下来的，而不是只看一行结算数字。

const MAX_PER_SIDE = 7
const DEPTH = 30          // 高于玩家(20)，低于交互提示(60)
const MARCH_MS = 820
const LUNGE_MS = 250
const LUNGES = 3
const RESOLVE_MS = 620

// 各城门朝外的方向，进攻方沿这个方向推进
const OUTWARD = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 }
}

// 依据投入兵力决定场面大小（上限封顶），骑兵占比决定队列里骑兵的数量
export function rosterSize(committed, cavShare) {
  const size = Math.max(3, Math.min(MAX_PER_SIDE, Math.round(Math.sqrt(Math.max(1, committed)) / 1.2)))
  return { size, cav: Math.min(0.6, Math.max(0.15, cavShare || 0.2)) }
}

export class BattleFx {
  constructor(scene) {
    this.scene = scene
    this.busy = false
    this.units = []
    this.timers = []
  }

  get active() {
    return this.busy
  }

  // 阻塞重复触发；动画期间由 WorldScene 锁住玩家操作
  stop() {
    for (const t of this.timers) t.remove(false)
    this.timers = []
    for (const u of this.units) u.img.destroy()
    this.units = []
    this.busy = false
  }

  play({ gate, result, onDone, monsterKey = null }) {
    if (this.busy) {
      onDone?.()
      return
    }
    this.busy = true
    const raid = !!monsterKey

    const n = OUTWARD[gate.side] || OUTWARD.n
    const perp = { x: -n.y, y: n.x }        // 队形横轴
    // gate 标记本身就落在护城河上，直接当交战中心
    const gx = gate.x ?? gate.wall?.x ?? 0
    const gy = gate.y ?? gate.wall?.y ?? 0
    const cx = gx + n.x * 18
    const cy = gy + n.y * 18

    const a = rosterSize(result.committed, result.atkCav)
    const d = rosterSize(result.defend / 6, raid ? 0 : result.defCav)

    // 攻城：双方都是人（长枪兵/圆盾兵 + 骑兵）。
    // 讨伐：对面是野兽或山贼，只有一套贴图，没有骑步之分。
    const atkTex = cav => `bat_atk_${cav ? 'cav' : 'foot'}_`
    const defTex = raid ? () => `bat_mon_${monsterKey}_` : (cav => `bat_def_${cav ? 'cav' : 'foot'}_`)

    const atk = this.formUp(cx, cy, n, perp, a.size, a.cav, atkTex, 1)
    const def = this.formUp(cx, cy, n, perp, d.size, raid ? 0 : d.cav, defTex, -1)

    const label = raid
      ? (result.win ? '荡平营寨' : '讨伐失利')
      : (result.win ? '城门易主' : '攻之不下')
    this.float(`${label}`, cx, cy - 64, result.win ? '#ffd24a' : '#ff9a9a', 26)
    this.float(
      `${Math.round(result.attack)} vs ${Math.round(result.defend)}　胜算 ${Math.round(result.chance * 100)}%`,
      cx, cy - 34, '#e8e0c8', 15
    )

    // 1) 进军
    const marchMs = MARCH_MS + 90
    atk.forEach((u, i) => {
      const tgt = this.offset(cx, cy, n, perp, i, atk.length, 30)
      this.walk(u, tgt.x, tgt.y, marchMs, i * 70)
    })
    def.forEach((u, i) => {
      const tgt = this.offset(cx, cy, n, perp, i, def.length, -30)
      this.walk(u, tgt.x, tgt.y, marchMs - 120, i * 70)
    })

    // 2) 交锋：三轮对冲，每次接触迸出火星并轻微震屏
    this.after(marchMs + 120, () => {
      for (let r = 0; r < LUNGES; r++) {
        const t0 = r * LUNGE_MS * 2
        this.after(t0, () => {
          atk.forEach(u => this.lunge(u, n, 15))
          def.forEach(u => this.lunge(u, n, -15))
        })
        this.after(t0 + LUNGE_MS, () => {
          this.sparks(cx, cy)
          this.scene.cameras.main.shake(90, 0.0035)
        })
        this.after(t0 + LUNGE_MS + 10, () => {
          atk.forEach(u => this.backswing(u, n, 15))
          def.forEach(u => this.backswing(u, n, -15))
        })
      }
      this.after(LUNGES * LUNGE_MS * 2 + 60, () => this.resolve(atk, def, n, cx, cy, result, raid))
    })

    this.after(marchMs + 120 + LUNGES * LUNGE_MS * 2 + 60 + RESOLVE_MS, () => {
      this.stop()
      onDone?.()
    })
  }

  // 沿进攻轴排成一列纵队。texOf(cav) 决定用哪套贴图：
  // 攻城是长枪兵/圆盾兵，讨伐则是野兽或山贼。
  formUp(cx, cy, n, perp, size, cavFrac, texOf, dir) {
    const row = []
    for (let i = 0; i < size; i++) {
      const cav = cavFrac > 0 && ((i + 1) % 3 === 0) && Math.random() < cavFrac * 3
      const p = this.offset(cx, cy, n, perp, i, size, dir * 170)
      const tex = texOf(cav)
      const img = this.scene.add
        .image(p.x, p.y, `${tex}0`)
        .setOrigin(0.5, cav ? 0.9 : 0.92)
        .setDepth(DEPTH)
      row.push({ img, cav, tex, frame: 0, cx, cy, n, perp })
    }
    this.units.push(...row)
    return row
  }

  offset(cx, cy, n, perp, i, size, along) {
    const lat = (i - (size - 1) / 2) * 30
    return { x: cx + perp.x * lat + n.x * along, y: cy + perp.y * lat + n.y * along }
  }

  walk(u, x, y, ms, delay) {
    this.after(delay, () => {
      const t = this.scene.tweens.add({
        targets: u.img, x, y, duration: ms, ease: 'Sine.easeInOut'
      })
      const cyc = this.scene.time.addEvent({
        delay: 120, loop: true,
        callback: () => this.setFrame(u)
      })
      this.timers.push(cyc)
      // Phaser 3/4 的补间完成回调接口不同，这里做兼容；
      // 抛异常会中断整个时钟，后续计时器全部停摆，所以绝不能走错分支。
      const done = () => { cyc.remove(false); this.setFrame(u, 0) }
      if (typeof t.call === 'function') t.call(done)
      else if (t.onComplete && typeof t.onComplete.addCallback === 'function') t.onComplete.addCallback(done)
      else t.once?.('complete', done)
    })
  }

  setFrame(u, forced) {
    if (!u.img || !u.img.active) return
    u.frame = forced != null ? forced : (u.frame + 1) % 4
    u.img.setTexture(`${u.tex}${u.frame}`)
  }

  // 向前刺出再收回，交锋才有对砍的节奏
  lunge(u, n, amount) {
    if (!u.img?.active) return
    this.scene.tweens.add({
      targets: u.img,
      x: u.img.x + n.x * amount,
      y: u.img.y + n.y * amount,
      duration: 110, ease: 'Quad.easeOut'
    })
  }

  backswing(u, n, amount) {
    if (!u.img?.active) return
    this.scene.tweens.add({
      targets: u.img,
      x: u.img.x - n.x * amount,
      y: u.img.y - n.y * amount,
      duration: 130, ease: 'Quad.easeIn'
    })
  }

  sparks(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random()
      const s = this.scene.add
        .circle(x, y, 2 + Math.random() * 2, 0xffd24a, 0.95)
        .setDepth(DEPTH + 1)
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 26,
        y: y + Math.sin(a) * 26,
        alpha: 0, duration: 260 + Math.random() * 160,
        onComplete: () => s.destroy()
      })
    }
  }

  // 分胜负：败方溃散并标出伤亡数字，胜方推进
  resolve(atk, def, n, cx, cy, result, raid = false) {
    const losers = result.win ? def : atk
    const winners = result.win ? atk : def
    const wdir = result.win ? 1 : -1

    losers.forEach(u => {
      this.scene.tweens.add({
        targets: u.img,
        x: u.img.x + n.x * wdir * (40 + Math.random() * 40),
        y: u.img.y + n.y * wdir * (40 + Math.random() * 40) - 10,
        alpha: 0.05, angle: (Math.random() > 0.5 ? 1 : -1) * (25 + Math.random() * 45),
        duration: RESOLVE_MS, ease: 'Quad.easeIn'
      })
    })
    winners.forEach(u => {
      this.scene.tweens.add({
        targets: u.img,
        x: u.img.x + n.x * wdir * 26,
        y: u.img.y + n.y * wdir * 26,
        alpha: 0.9, duration: RESOLVE_MS, ease: 'Quad.easeOut'
      })
    })

    this.float(
      result.win ? `折损 ${result.lost} 兵` : `折损 ${result.lost} 兵，退兵`,
      cx, cy + 30, result.win ? '#9be89b' : '#ff9a9a', 17
    )
    if (result.win) {
      this.float(raid ? '平！' : '占！', cx, cy - 6, '#ffd24a', 30)
    }
  }

  float(text, x, y, color, size) {
    const t = this.scene.add
      .text(x, y, text, {
        fontSize: `${size}px Arial`,
        color,
        fontStyle: 'bold',
        stroke: '#1a1408',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 2)
    this.scene.tweens.add({
      targets: t, y: y - 22, alpha: 0, duration: 1100, delay: 260,
      onComplete: () => t.destroy()
    })
    return t
  }

  after(ms, fn) {
    const e = this.scene.time.delayedCall(Math.max(0, ms), fn)
    this.timers.push(e)
    return e
  }
}
