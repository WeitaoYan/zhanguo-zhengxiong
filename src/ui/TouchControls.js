// 移动端触屏控制：左侧虚拟摇杆（移动）+ 右侧动作按钮（映射键盘按键）。
// 只在 pointer: coarse 的触屏设备上创建，桌面端完全不受影响。

import { C, makeRoundButton, fixScroll } from './theme.js'

// 是否以触屏为主要输入（手机/平板）。带触屏的桌面笔记本不会误判。
// 调试口：URL 加 ?touch=1 强制开启，?touch=0 强制关闭。
export function isTouchPrimary() {
  try {
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('touch') === '1') return true
    if (qs.get('touch') === '0') return false
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
    const touch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
    return !!(coarse && touch)
  } catch {
    return false
  }
}

const JX = 140
const JY = 616
const JR = 76
const DEAD = 10

export class TouchControls {
  // onKey(code): 按下动作按钮时调用，code 与键盘事件保持一致（'KeyE' 等）
  constructor(scene, onKey) {
    this.scene = scene
    this.onKey = onKey
    this.moveVec = { x: 0, y: 0 }
    this.joyId = null

    this.c = scene.add.container(0, 0).setDepth(250).setScrollFactor(0)
    this.buildJoystick()
    this.buildButtons()
    // 修复：摇杆/按钮是 scrollFactor(0) 容器的孩子，孩子默认 scrollFactor 1
    // 会导致 hitTest 坐标错位（错位量 = 相机 scroll），触屏点按全部miss。
    fixScroll(this.c)
    this.hookSceneInput()
  }

  buildJoystick() {
    this.joyBase = this.scene.add.circle(JX, JY, JR, 0x0b0e17, 0.5)
      .setStrokeStyle(3, C.gold, 0.75)
    // 内圈刻度：上下左右四个小点，暗示八方向
    this.dots = []
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2
      const d = this.scene.add.circle(JX + Math.cos(a) * (JR - 16), JY + Math.sin(a) * (JR - 16), 3, C.gold, 0.5)
      this.dots.push(d)
    }
    this.joyKnob = this.scene.add.circle(JX, JY, 30, 0x2a3a55, 0.92)
      .setStrokeStyle(2, 0xffe27a, 0.95)
    this.joyBase.setInteractive({ useHandCursor: false })
    this.joyBase.on('pointerdown', p => {
      this.joyId = p.id
      this.updateJoy(p)
    })
    this.c.add([this.joyBase, ...this.dots, this.joyKnob])
  }

  hookSceneInput() {
    this._onMove = p => {
      if (p.id === this.joyId && p.isDown) this.updateJoy(p)
    }
    this._onUp = p => {
      if (p.id === this.joyId) this.resetJoy()
    }
    this.scene.input.on('pointermove', this._onMove)
    this.scene.input.on('pointerup', this._onUp)
    this.scene.input.on('pointercancel', this._onUp)
    // 场景切换/遮挡时兜底：手指莫名消失也不让角色一直走
    this._onBlur = () => this.resetJoy()
    window.addEventListener('blur', this._onBlur)
  }

  updateJoy(p) {
    let dx = p.x - JX
    let dy = p.y - JY
    const dist = Math.hypot(dx, dy)
    if (dist < DEAD) {
      this.moveVec.x = 0
      this.moveVec.y = 0
      this.joyKnob.setPosition(JX, JY)
      return
    }
    const nx = dx / dist
    const ny = dy / dist
    // 力度 0~1：推出死区后线性增大，推满即全速
    const mag = Math.min(1, (dist - DEAD) / (JR - DEAD))
    this.moveVec.x = nx * mag
    this.moveVec.y = ny * mag
    const kr = Math.min(dist, JR - 18)
    this.joyKnob.setPosition(JX + nx * kr, JY + ny * kr)
  }

  resetJoy() {
    this.joyId = null
    this.moveVec.x = 0
    this.moveVec.y = 0
    this.joyKnob?.setPosition(JX, JY)
  }

  buildButtons() {
    this.buttons = []
    const add = (x, y, r, label, code, opts) => {
      const b = makeRoundButton(this.scene, this.c, x, y, r, label, () => this.onKey(code), opts)
      this.buttons.push(b)
      return b
    }
    // 右下：两个大键（交谈/出兵是最常用的）
    add(842, 628, 50, '交谈', 'KeyE', { strokeWidth: 4, stroke: 0xffe27a })
    add(952, 628, 42, '出兵', 'KeyF')
    // 上方一排小键
    add(842, 508, 30, '整备', 'KeyC', { fontSize: '15px' })
    add(918, 508, 30, '名册', 'KeyM', { fontSize: '15px' })
    add(990, 508, 28, '关卡', 'KeyL', { fontSize: '14px' })
  }

  setVisible(v) {
    this.c.setVisible(v)
    // 容器隐藏时子对象仍可能吃输入，这里显式开关，保证面板弹出时底下按钮点不到
    for (const b of this.buttons) {
      if (v) b.bg.setInteractive({ useHandCursor: true })
      else b.bg.disableInteractive()
    }
    if (v) this.joyBase.setInteractive({ useHandCursor: false })
    else {
      this.joyBase.disableInteractive()
      this.resetJoy()
    }
  }

  destroy() {
    this.scene.input.off('pointermove', this._onMove)
    this.scene.input.off('pointerup', this._onUp)
    this.scene.input.off('pointercancel', this._onUp)
    window.removeEventListener('blur', this._onBlur)
    this.c.destroy(true)
  }
}
