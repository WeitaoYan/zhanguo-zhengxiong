import { WORLD_W, WORLD_H, cityBox } from '../world/layout.js'
import { CITIES, canAttack, totalTroops, totalGold } from '../data/cities.js'
import { defenderPower, troopCount, goldPerTick, upkeepPerTick, TICK_MS } from '../data/military.js'
import { DIFFICULTIES, difficultyOf } from '../data/difficulty.js'
import { currentStage, stageSummary } from '../data/stages.js'

const MM_W = 208
const MM_H = Math.round((WORLD_H / WORLD_W) * MM_W)

const PANEL = { x: 12, y: 12, w: 268, h: 90 }
const MAP_POS = { x: 1024 - MM_W - 12, y: 12 }
const LEDGER = { x: 1024 / 2 - 230, y: 96, w: 460, rowH: 26 }

export class Hud {
  constructor(scene) {
    this.scene = scene
    this.tweens = scene.tweens
    this.mapTex = null
    this.buildStatus()
    this.buildAlert()
    this.buildMinimap()
    this.buildLedger()
    this.buildDialogue()
    this.buildBanner()
    this.buildHints()
  }

  // ---------- 敌情条 ----------
  // NPC 宣战之后会一直挂在这里倒计时，玩家走到哪都看得见哪座城要挨打。
  buildAlert() {
    const scene = this.scene
    const c = scene.add.container(512, 52).setDepth(110).setScrollFactor(0).setVisible(false)

    const bg = scene.add.rectangle(0, 0, 460, 26, 0x40100f, 0.88)
      .setStrokeStyle(1, 0xff6666)
    c.add(bg)

    this.alertText = scene.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffb4b4'
    }).setOrigin(0.5)
    c.add(this.alertText)

    this.alert = c
  }

  setAlert(list) {
    if (!this.alert) return
    if (!list || !list.length) {
      this.alert.setVisible(false)
      return
    }
    const first = list[0]
    const secs = Math.max(0, Math.round(first.ticks * TICK_MS / 1000))
    const more = list.length > 1 ? `　（另有 ${list.length - 1} 路）` : ''
    this.alertText.setText(
      `敌袭：${first.attacker.name} → ${first.target.name}　约 ${secs} 秒后接战${more}`
    )
    this.alert.setVisible(true)
  }

  // ---------- 城池名册（M 键） ----------
  buildLedger() {
    const scene = this.scene
    const h = 44 + CITIES.length * LEDGER.rowH + 30
    const c = scene.add.container(LEDGER.x, LEDGER.y).setDepth(150).setScrollFactor(0)
    c.setVisible(false)

    const bg = scene.add.rectangle(LEDGER.w / 2, 0, LEDGER.w, h, 0x0d0f18, 0.92)
      .setOrigin(0.5, 0).setStrokeStyle(2, 0xffcc00)
    c.add(bg)

    c.add(scene.add.text(LEDGER.w / 2, 20, '城 池 名 册', {
      fontSize: '19px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold'
    }).setOrigin(0.5))

    this.ledgerRows = []
    for (let i = 0; i < CITIES.length; i++) {
      const name = scene.add.text(20, 44 + i * LEDGER.rowH, '', {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff'
      })
      const owner = scene.add.text(110, 44 + i * LEDGER.rowH, '', {
        fontSize: '13px', fontFamily: 'Arial', color: '#cccccc'
      })
      const diff = scene.add.text(200, 44 + i * LEDGER.rowH, '', {
        fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa'
      })
      const stat = scene.add.text(LEDGER.w - 20, 44 + i * LEDGER.rowH, '', {
        fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa'
      }).setOrigin(1, 0)
      c.add([name, owner, diff, stat])
      this.ledgerRows.push({ name, owner, diff, stat })
    }

    this.ledgerHint = scene.add.text(
      LEDGER.w / 2, 44 + CITIES.length * LEDGER.rowH + 2,
      '红框＝可攻打（与领地相邻）　M 关闭', {
        fontSize: '12px', fontFamily: 'Arial', color: '#8899aa'
      }).setOrigin(0.5)
    c.add(this.ledgerHint)

    this.ledger = c
  }

  refreshLedger() {
    if (!this.ledger) return
    const owned = CITIES.filter(c => c.owner === 'player').map(c => c.id)

    CITIES.forEach((city, i) => {
      const row = this.ledgerRows[i]
      const mine = city.owner === 'player'
      const attackable = canAttack(city.id, owned)
      const diff = difficultyOf(city)

      row.name.setText(`${attackable ? '▶ ' : '  '}${city.name}`)
      row.name.setColor(mine ? '#ffcc00' : '#ffffff')
      row.owner.setText(mine ? '你' : `城主 ${city.lord}`)
      // 自己的城不显示难度：难度描述的是"这座城当对手时有多难"
      row.diff.setText(mine ? '—' : diff.name)
      row.diff.setColor(mine ? '#6f7f8f' : diff.hex)
      const troops = `步${city.troops.infantry} 骑${city.troops.cavalry}`
      row.stat.setText(mine
        ? `金 ${Math.floor(city.gold)}　兵 ${troops}`
        : `城防 ${Math.round(defenderPower(city))}　${troops}`)
      row.stat.setColor(attackable ? '#ff7777' : '#9a9a9a')
    })

    this.ledgerHint.setText(
      `第 ${currentStage().rank} 关 ${currentStage().name}　${stageSummary(currentStage())}　·　总兵力 ${totalTroops()}　金库 ${Math.floor(totalGold())}　M 关闭`
    )
  }

  toggleLedger() {
    if (!this.ledger) return
    this.ledger.setVisible(!this.ledger.visible)
  }

  // ---------- 状态面板 ----------
  buildStatus() {
    const scene = this.scene
    const c = scene.add.container(PANEL.x, PANEL.y).setDepth(100).setScrollFactor(0)

    const bg = scene.add.rectangle(0, 0, PANEL.w, PANEL.h, 0x0d0f18, 0.78)
    bg.setOrigin(0, 0).setStrokeStyle(1, 0xffcc00)
    c.add(bg)

    this.armyText = scene.add.text(12, 8, '', {
      fontSize: '15px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold'
    })
    c.add(this.armyText)

    this.ownedText = scene.add.text(12, 30, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffffff'
    })
    c.add(this.ownedText)

    // 关卡与难度配比：一局游戏的压力曲线，放在最显眼的位置
    this.stageText = scene.add.text(12, 50, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#ffcc33'
    })
    c.add(this.stageText)

    this.placeText = scene.add.text(12, 68, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#9fd8ff'
    })
    c.add(this.placeText)

    this.status = c
  }

  // ---------- 小地图 ----------
  buildMinimap() {
    const scene = this.scene
    const c = scene.add.container(MAP_POS.x, MAP_POS.y).setDepth(100).setScrollFactor(0)

    const frame = scene.add.rectangle(0, 0, MM_W + 8, MM_H + 8, 0x0d0f18, 0.8)
      .setOrigin(0, 0).setStrokeStyle(1, 0xffcc00)
    c.add(frame)

    this.mapTex = scene.textures.createCanvas('minimap', MM_W, MM_H)
    this.mapCanvas = this.mapTex.getCanvas()
    this.mapImg = scene.add.image(4, 4, 'minimap').setOrigin(0, 0)
    c.add(this.mapImg)

    this.mapDot = scene.add.image(0, 0, 'mm_dot').setOrigin(0.5, 0.5)
    c.add(this.mapDot)

    this.mapLabel = scene.add.text(4, MM_H + 12, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#cccccc'
    })
    c.add(this.mapLabel)

    this.minimap = c
    this.redrawMap()
  }

  toMap(wx, wy) {
    return { x: (wx / WORLD_W) * MM_W, y: (wy / WORLD_H) * MM_H }
  }

  redrawMap() {
    const ctx = this.mapCanvas.getContext('2d')
    const sx = MM_W / WORLD_W
    const sy = MM_H / WORLD_H
    const owned = CITIES.filter(c => c.owner === 'player').map(c => c.id)

    ctx.clearRect(0, 0, MM_W, MM_H)
    ctx.fillStyle = '#1d2a1c'
    ctx.fillRect(0, 0, MM_W, MM_H)

    // 官道
    ctx.strokeStyle = 'rgba(190,160,110,0.55)'
    ctx.lineWidth = 1.5
    for (let row = 0; row < 3; row++) {
      const y = (MM_H / 3) * (row + 0.5)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(MM_W, y)
      ctx.stroke()
    }
    for (let col = 0; col < 3; col++) {
      const x = (MM_W / 3) * (col + 0.5)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, MM_H)
      ctx.stroke()
    }

    // 城池：难度决定描边颜色，敌城左上角再标一个难度字
    for (const city of CITIES) {
      const b = cityBox(city)
      const x = b.x * sx
      const y = b.y * sy
      const w = b.w * sx
      const h = b.h * sy
      const mine = city.owner === 'player'
      const diff = difficultyOf(city)

      ctx.fillStyle = mine ? 'rgba(255,204,51,0.85)' : `rgba(${(city.color >> 16) & 255},${(city.color >> 8) & 255},${city.color & 255},0.8)`
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = mine ? '#fff2b0' : diff.hex
      ctx.lineWidth = mine ? 1 : 1.5
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

      if (!mine && canAttack(city.id, owned)) {
        ctx.strokeStyle = '#ff5555'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 2])
        ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3)
        ctx.setLineDash([])
      }

      if (!mine) {
        ctx.fillStyle = diff.hex
        ctx.font = 'bold 8px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(diff.short, x + 1.5, y + 8)
      }

      ctx.fillStyle = mine ? '#3a2a00' : '#ffffff'
      ctx.font = 'bold 8px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(city.name, x + w / 2, y + h / 2 + 3)
    }

    this.mapTex.refresh()
  }

  updateDot(wx, wy) {
    const p = this.toMap(wx, wy)
    this.mapDot.setPosition(p.x + 4, p.y + 4)
  }

  // ---------- 对话框 ----------
  buildDialogue() {
    const scene = this.scene
    const c = scene.add.container(512, 656).setDepth(120).setScrollFactor(0).setVisible(false)
    c.add(scene.add.image(0, 0, 'dialogue_bg'))

    this.dlgName = scene.add.text(-270, -44, '', {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold'
    })
    c.add(this.dlgName)

    this.dlgBody = scene.add.text(-270, -14, '', {
      fontSize: '15px', fontFamily: 'Arial', color: '#ffffff',
      wordWrap: { width: 540 }, lineSpacing: 6
    })
    c.add(this.dlgBody)

    this.dlgHint = scene.add.text(270, 40, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#aaaacc'
    }).setOrigin(1, 1)
    c.add(this.dlgHint)

    this.dialogue = c
  }

  openDialogue(name, lines, hint = '[E] 继续') {
    this.dlgName.setText(name)
    this.dlgBody.setText(lines[0])
    this.dlgHint.setText(lines.length > 1 ? hint : '[E] 结束')
    this.dialogue.setVisible(true)
  }

  setDialogueLine(text, hint) {
    this.dlgBody.setText(text)
    this.dlgHint.setText(hint)
  }

  closeDialogue() {
    this.dialogue.setVisible(false)
  }

  // ---------- 城名横幅 ----------
  buildBanner() {
    const scene = this.scene
    const c = scene.add.container(512, 250).setDepth(130).setScrollFactor(0)
    c.setAlpha(0)

    const bg = scene.add.rectangle(0, 0, 460, 84, 0x0d0f18, 0.86).setStrokeStyle(2, 0xffcc00)
    c.add(bg)

    this.bannerTitle = scene.add.text(0, -14, '', {
      fontSize: '28px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold'
    }).setOrigin(0.5)
    c.add(this.bannerTitle)

    this.bannerSub = scene.add.text(0, 20, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
    }).setOrigin(0.5)
    c.add(this.bannerSub)

    this.banner = c
  }

  showBanner(title, sub, tint = 0xffcc00) {
    this.bannerTitle.setText(title)
    this.bannerSub.setText(sub || '')
    this.bannerTitle.setColor(`#${tint.toString(16).padStart(6, '0')}`)
    this.tweens.killTweensOf(this.banner)
    this.banner.setAlpha(0).setScale(0.9)
    this.tweens.add({
      targets: this.banner,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: this.banner,
          alpha: 0,
          delay: 1400,
          duration: 420
        })
      }
    })
  }

  // ---------- 提示条 ----------
  buildHints() {
    const scene = this.scene
    const inst = scene.add.container(512, 22).setDepth(100).setScrollFactor(0)
    const bg = scene.add.rectangle(0, 0, 470, 26, 0x000000, 0.6).setStrokeStyle(1, 0xffcc00)
    inst.add(bg)
    inst.add(scene.add.text(0, 0,
      '方向键/WASD 移动 | E 对话/继续 | F 出兵/讨伐 | C 整备 | M 城池 | L 关卡',
      { fontSize: '11px', fontFamily: 'Arial', color: '#cccccc' }
    ).setOrigin(0.5))
  }


  // ---------- 每帧刷新 ----------
  update(ownedCount, placeName, wx, wy, extra = {}) {
    const gold = Math.floor(totalGold())
    const troops = totalTroops()
    this.armyText.setText(`兵力 ${troops}　金库 ${gold}`)
    const camps = extra.camps == null ? null : `　营寨 ${extra.camps} 处`
    this.ownedText.setText(`领地 ${ownedCount} / ${CITIES.length}${camps || ''}`)
    const stage = currentStage()
    this.stageText.setText(`第${stage.rank}关 ${stage.name}　${stageSummary(stage)}`)
    this.placeText.setText(`所在：${placeName}`)
    this.updateDot(wx, wy)
  }

  // 供 WorldScene 查询某城门是否可攻
  static gateStatus(city) {
    const owned = CITIES.filter(c => c.owner === 'player').map(c => c.id)
    if (city.owner === 'player') return { state: 'own' }
    if (canAttack(city.id, owned)) return { state: 'attackable' }
    return { state: 'blocked' }
  }
}
