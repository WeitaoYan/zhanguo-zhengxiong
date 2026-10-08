// 关卡选择 / 开局界面。
//
// 九个城池的地图是固定的，真正决定这一局难度的是"八家城主分别有多凶"。
// 所以开场先让玩家挑一关：从八家容易一直到八家地狱，中间覆盖各档混编。
//
// 关键约定：这里只负责选，不负责改数据——确认后由 WorldScene 调 applyStage()
// 并刷新世界表现。中途按 L 也能把它叫回来，此时 E 需要按两次才会真的重开，
// 免得手一抖把半局经营清空。

import { STAGES, currentStage, stageSummary, stageIndex } from '../data/stages.js'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/difficulty.js'
import { FONT_UI, FONT_TITLE, makeButton } from './theme.js'

const W = 850
const H = 680
const ROW_H = 40
const ROW_X = -W / 2 + 30
const LIST_Y = -150
const DESC_Y = LIST_Y + STAGES.length * ROW_H + 8
const LEGEND_Y = DESC_Y + 52
const FOOT_Y = H / 2 - 40

export class StageSelect {
  constructor(scene, handlers = {}) {
    this.scene = scene
    this.onConfirm = handlers.confirm || null
    this.onCancel = handlers.cancel || null
    this.touch = !!handlers.touch
    this.choice = 0
    this.armed = false
    this.firstRun = true
    this.visible = false
    this.openedAt = 0
    this.keyHandler = ev => this.onKey(ev)
    this.build()
  }

  get open() {
    return this.visible
  }

  build() {
    const scene = this.scene
    const c = scene.add.container(512, 384).setDepth(300).setScrollFactor(0).setVisible(false)
    this.c = c

    c.add(scene.add.rectangle(0, 0, W, H, 0x0b0e17, 0.96).setStrokeStyle(2, 0xffcc00))
    c.add(scene.add.rectangle(0, -H / 2 + 2, W - 4, 3, 0xffcc00, 0.85))

    // 主标题：书法体「战国争霸」
    c.add(scene.add.text(0, -H / 2 + 16, '战国争霸', {
      fontSize: '54px', fontFamily: FONT_TITLE, color: '#ffcc00'
    }).setOrigin(0.5, 0))
    c.add(scene.add.text(0, -H / 2 + 76, '九 城 争 霸 · 选 关', {
      fontSize: '15px', fontFamily: FONT_UI, color: '#ffe27a'
    }).setOrigin(0.5, 0))

    // 装饰线：两线一菱
    const dy = -H / 2 + 106
    c.add(scene.add.rectangle(-155, dy, 270, 1, 0x8a6f2a, 0.9))
    c.add(scene.add.rectangle(155, dy, 270, 1, 0x8a6f2a, 0.9))
    const dia = scene.add.rectangle(0, dy, 9, 9, 0xffcc00, 0.95)
    dia.setAngle(45)
    c.add(dia)

    this.intro = scene.add.text(0, -H / 2 + 120,
      '你是青禾城城主。地图上还有八座敌城，各有城主坐镇——他们的凶悍程度，就是这一局的难度。\n' +
      '挑一关开始：越往下的关卡，敌人开局越强、来犯越勤、野外营寨也越硬。\n' +
      '城外旷野还有狼群与山贼盘踞，荡平营寨就能收编兵员，是开局最快的扩军路子。',
      {
        fontSize: '13px', fontFamily: FONT_UI, color: '#c8d4e4',
        align: 'center', lineSpacing: 6
      }).setOrigin(0.5, 0)
    c.add(this.intro)

    this.rows = STAGES.map((stage, i) => {
      const y = LIST_Y + i * ROW_H
      const hl = scene.add.rectangle(0, y + ROW_H / 2 - 4, W - 40, ROW_H - 6, 0x1b2436, 0)
        .setStrokeStyle(1, 0x3d4f6b)
      const name = scene.add.text(ROW_X, y + 9, '', {
        fontSize: '15px', fontFamily: FONT_UI, color: '#ffffff'
      })
      const plan = scene.add.text(W / 2 - 30, y + 11, '', {
        fontSize: '12px', fontFamily: FONT_UI, color: '#9fb4cc'
      }).setOrigin(1, 0)
      c.add([hl, name, plan])
      if (this.touch) {
        hl.setInteractive({ useHandCursor: true })
        hl.on('pointerdown', () => this.tapRow(i))
      }
      return { hl, name, plan, stage }
    })

    this.desc = scene.add.text(0, DESC_Y, '', {
      fontSize: '13px', fontFamily: FONT_UI, color: '#ffe8a8',
      align: 'center', wordWrap: { width: W - 80 }, lineSpacing: 6
    }).setOrigin(0.5, 0)
    c.add(this.desc)

    const legend = DIFFICULTY_ORDER.map(k => DIFFICULTIES[k]).map(d =>
      `${d.name}：开局 ×${d.startTroops}　来犯门槛 ${d.assault.edge}×　准备 ${Math.round(d.assault.warn * 2)}s`
    ).join('\n')
    this.legend = scene.add.text(-W / 2 + 30, LEGEND_Y, legend, {
      fontSize: '11px', fontFamily: FONT_UI, color: '#8899aa', lineSpacing: 3
    })
    c.add(this.legend)

    this.foot = scene.add.text(0, FOOT_Y, '', {
      fontSize: '13px', fontFamily: FONT_UI, color: '#ffcc00'
    }).setOrigin(0.5, 0)
    c.add(this.foot)

    if (this.touch) this.buildTouchButtons()
  }

  // 触屏：底部大按钮代替键盘。开始/重开走同一套 confirm 逻辑
  // （中途重开仍需按两次，第二次才真的推倒重来）。
  buildTouchButtons() {
    const y = H / 2 - 34
    this.startBtn = makeButton(this.scene, this.c, 110, y, 210, 38, '开始这一关',
      () => this.confirm(), { strokeWidth: 2 })
    this.cancelBtn = makeButton(this.scene, this.c, -110, y, 150, 38, '返回',
      () => this.hide(true))
    this.foot.setVisible(false)
  }

  // 触屏点行：选中；开场时连点两下直接开局（反正只是开始）
  tapRow(i) {
    if (!this.visible) return
    if (this.choice === i && this.firstRun) {
      this.confirm()
      return
    }
    this.choice = i
    this.armed = false
    this.refresh()
  }

  show(firstRun = false) {
    this.firstRun = firstRun
    this.visible = true
    this.armed = false
    if (firstRun) this.choice = stageIndex()
    // 记下开启时刻：开启它的那一次按键会在同一个更新帧里继续派发到本监听器上，
    // 靠时间戳把它滤掉，否则"按 L 打开"会被自己立刻关掉。
    this.openedAt = performance.now()
    this.c.setVisible(true)
    // 入场：淡入 + 轻微放大，选关界面也是游戏的"标题屏"
    this.c.setAlpha(0).setScale(0.97)
    this.scene.tweens.add({
      targets: this.c,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Cubic.out'
    })
    this.scene.input.keyboard?.on('keydown', this.keyHandler)
    this.refresh()
  }

  hide(cancelled = false) {
    if (!this.visible) return
    this.visible = false
    this.armed = false
    this.c.setVisible(false)
    this.scene.input.keyboard?.off('keydown', this.keyHandler)
    if (cancelled) this.onCancel?.()
  }

  onKey(ev) {
    if (!this.visible) return
    // 开启本界面的那一次按键不再重复处理（同一帧内会被再派发一次）
    if (ev.timeStamp <= this.openedAt) return
    const code = ev.code || ''
    let used = true
    if (code === 'ArrowUp' || code === 'KeyW') { this.choice = (this.choice - 1 + STAGES.length) % STAGES.length; this.armed = false }
    else if (code === 'ArrowDown' || code === 'KeyS') { this.choice = (this.choice + 1) % STAGES.length; this.armed = false }
    else if (/^Digit[1-8]$/.test(code)) { this.choice = Number(code.slice(5)) - 1; this.armed = false }
    else if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') this.confirm()
    else if (code === 'Escape' || code === 'KeyM' || code === 'KeyL') {
      if (this.firstRun) used = false
      else this.hide(true)
    } else used = false
    if (this.visible && used) this.refresh()
    if (used) ev.preventDefault?.()
  }

  confirm() {
    if (this.firstRun) {
      const i = this.choice
      this.hide()
      this.onConfirm?.(i)
      return
    }
    // 中途重开：E 按两次，第二次才真的把这一局推倒重来
    if (!this.armed) {
      this.armed = true
      this.refresh()
      return
    }
    const i = this.choice
    this.hide()
    this.onConfirm?.(i)
  }

  move(dir) {
    this.choice = (this.choice + dir + STAGES.length) % STAGES.length
    this.armed = false
    this.refresh()
  }

  refresh() {
    this.rows.forEach((r, i) => {
      const sel = i === this.choice
      r.hl.setFillStyle(0x1b2436, sel ? 0.9 : 0)
      r.hl.setStrokeStyle(1, sel ? 0xffcc00 : 0x3d4f6b)
      r.name.setText(`${sel ? '▶ ' : '  '}第${r.stage.rank}关　${r.stage.name}　[${r.stage.tag}]`)
      r.name.setColor(sel ? '#ffcc00' : '#ffffff')
      r.plan.setText(stageSummary(r.stage))
      r.plan.setColor(sel ? '#ffe8a8' : '#9fb4cc')
    })

    const stage = STAGES[this.choice]
    const now = currentStage()
    this.desc.setText(stage.desc)

    if (this.firstRun) {
      this.foot.setText('↑↓ 选关　数字键 1-8 直达　[E] 开始　·　E 对话　F 出兵/讨伐　C 整备　M 城池名册')
    } else if (this.armed) {
      this.foot.setText(`再按一次 [E] 确认重开：${stage.name}（当前进度会全部清空）　[M/Esc] 取消`)
    } else {
      this.foot.setText(`↑↓ 选关　[E] 重开选中的关卡　[M/Esc] 返回　·　当前：第${now.rank}关 ${now.name}`)
    }
    this.foot.setColor(this.armed ? '#ff9a9a' : '#ffcc00')

    // 触屏：按钮文案跟着状态走（中途重开第二次才真的清空进度）
    if (this.touch) {
      const label = this.firstRun ? '开始这一关' : this.armed ? '确认重开？' : '重开此关'
      this.startBtn.t.setText(label)
      const sx = this.firstRun ? 0 : 110
      this.startBtn.bg.setX(sx)
      this.startBtn.t.setX(sx)
      this.cancelBtn.setVisible(!this.firstRun)
    }
  }
}
