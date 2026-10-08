// 全局视觉主题：战国风「玄底金文」。
// 所有界面文字统一用衬线中文，对战国题材更有味道；
// 标题另用书法体。WebFont 在 index.html 里引入，BootScene 会等字体就绪。

export const FONT_UI = '"Noto Serif SC","Songti SC","STSong","SimSun","Microsoft YaHei",serif'
export const FONT_TITLE = '"Ma Shan Zheng","Noto Serif SC","Songti SC",serif'

export const C = {
  gold: 0xffcc00,
  goldBright: 0xffe27a,
  goldDim: 0x8a6f2a,
  ink: 0x0b0e17,          // 面板底
  inkSoft: 0x141a28,      // 行高亮底
  line: 0x3d4f6b,         // 暗描边
  lacquer: 0x101319,       // 更深的漆黑
  text: '#f2ead8',         // 米白正文
  textDim: '#9fb4cc',
  textFaint: '#6f7f8f',
  green: '#9be89b',
  red: '#ff9a9a',
  blue: '#9fd8ff'
}

export const CSS = {
  gold: '#ffcc00',
  goldBright: '#ffe27a',
  text: '#f2ead8',
  textDim: '#9fb4cc'
}

// 通用文字按钮：圆角矩形 + 按压缩放反馈，挂到任意 container 下。
// 坐标是相对父容器的本地坐标。
export function makeButton(scene, parent, x, y, w, h, label, cb, opts = {}) {
  const bg = scene.add.rectangle(x, y, w, h, opts.fill ?? 0x1b2436, opts.alpha ?? 0.96)
    .setStrokeStyle(opts.strokeWidth ?? 1.5, opts.stroke ?? C.gold)
  const t = scene.add.text(x, y, label, {
    fontSize: opts.fontSize || '15px',
    fontFamily: opts.titleFont ? FONT_TITLE : FONT_UI,
    color: opts.color || CSS.goldBright,
    fontStyle: opts.bold === false ? 'normal' : 'bold'
  }).setOrigin(0.5)
  bg.setInteractive({ useHandCursor: true })
  bg.on('pointerdown', () => {
    bg.setFillStyle(opts.fill ?? 0x1b2436, 1).setScale(0.96)
    t.setScale(0.96)
  })
  const release = () => {
    bg.setFillStyle(opts.fill ?? 0x1b2436, opts.alpha ?? 0.96).setScale(1)
    t.setScale(1)
  }
  bg.on('pointerup', () => { release(); cb() })
  bg.on('pointerout', release)
  parent.add([bg, t])

  return {
    bg, t,
    setVisible(v) { bg.setVisible(v); t.setVisible(v) },
    setEnabled(v) {
      bg.disableInteractive()
      if (v) bg.setInteractive({ useHandCursor: true })
      t.setAlpha(v ? 1 : 0.35)
      bg.setAlpha(v ? 1 : 0.5)
    },
    destroy() { bg.destroy(); t.destroy() }
  }
}

// 圆形触屏按钮（摇杆区动作键用）：漆黑底 + 金圈 + 米白字。
export function makeRoundButton(scene, parent, x, y, r, label, cb, opts = {}) {
  const bg = scene.add.circle(x, y, r, 0x141a28, 0.82)
    .setStrokeStyle(opts.strokeWidth ?? 3, opts.stroke ?? C.gold, opts.strokeAlpha ?? 0.95)
  const t = scene.add.text(x, y, label, {
    fontSize: opts.fontSize || `${Math.round(r * 0.52)}px`,
    fontFamily: FONT_UI,
    color: opts.color || CSS.text,
    fontStyle: 'bold'
  }).setOrigin(0.5)
  bg.setInteractive({ useHandCursor: true })
  bg.on('pointerdown', () => { bg.setScale(0.92); t.setScale(0.92) })
  const release = () => { bg.setScale(1); t.setScale(1) }
  bg.on('pointerup', () => { release(); cb() })
  bg.on('pointerout', release)
  parent.add([bg, t])
  return {
    bg, t,
    setVisible(v) { bg.setVisible(v); t.setVisible(v) }
  }
}

// 把容器及其所有子孙的 scrollFactor 设为 0。
// 血泪教训：Container.setScrollFactor(0) 不会继承给孩子，而 Phaser 的
// hitTest 用的是"被点对象自己"的 scrollFactor 做世界/屏幕坐标换算，
// 渲染却按容器的来。孩子若保持默认 scrollFactor 1，点击命中测试会
// 整体错位（错位量 = 相机 scroll），导致界面上看着对、点上去没反应。
// 所有 scrollFactor(0) 的 UI 容器，build 完孩子后都要调一次这个。
export function fixScroll(container) {
  container.setScrollFactor(0)
  container.each((child) => {
    child.setScrollFactor(0)
    if (child.type === 'Container' && child.each) fixScroll(child)
  })
  return container
}
