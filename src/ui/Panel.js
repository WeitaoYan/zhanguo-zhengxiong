import {
  MAX_LEVEL, BATCH, levelOf, troopCount, troopCapacity, armyLoad,
  goldPerTick, upkeepPerTick, spendableGold, upgradeCost, trainCost,
  canUpgrade, canTrain, applyUpgrade, applyTrain, cityPower, defenderPower,
  previewBattle, BRANCHES, BRANCH_BY_KEY, techFactor, corpsFactor, CORPS_STEP
} from '../data/military.js'
import { ownedCities, totalTroops, totalGold, CITIES } from '../data/cities.js'
import { difficultyOf, difficultyTag } from '../data/difficulty.js'

// 两种模式共用一个面板：城中整备（升级/练兵）与出兵（攻城 / 讨伐野外营寨）。
// 键位沿用玩家已确认的方案：方向键移动光标，E 确认，Esc/M 关闭；
// 出兵模式另有 A＝一键全军、Z＝全部撤回。

const PW = 976
const ROW_H = 46
const HEAD_H = 96
const FOOT_H = 74
const NAME_W = 150
// 5 列：步兵营 / 骑兵营 / 军械库 / 兵力系数 / 城墙
const COL_X = [NAME_W, NAME_W + 160, NAME_W + 320, NAME_W + 480, NAME_W + 640]
// 列数跟着 BRANCHES 走：以后再加一条分支，面板不用改这里
const COLS = BRANCHES.length
// 行数跟着城池数走：九座城全部到手时也要一屏列得下
const ROWS = CITIES.length
const BODY_H = ROW_H * ROWS

const KEY_LABELS = {
  infantry: '步兵营',
  cavalry: '骑兵营',
  armory: '军械库',
  corps: '兵力系数',
  wall: '城墙'
}

// 出兵模式的默认视图（攻城）：拿城防与攻城胜算来渲染
const CITY_VIEW = {
  defend: city => defenderPower(city),
  preview: (city, alloc) => previewBattle(city, alloc),
  title: target => `出 兵 · ${target.name}`,
  sub: target => `守方城防 ${Math.round(defenderPower(target))}${difficultyTag(target) === '—' ? '' : `　${difficultyOf(target).name}`}`
}

export class Panel {
  constructor(scene) {
    this.scene = scene
    this.mode = null
    this.row = 0
    this.col = 0
    this.target = null
    this.alloc = {}
    this.onConfirm = null
    this.view = CITY_VIEW
    this.build()
  }

  get open() {
    return this.mode !== null
  }

  build() {
    const scene = this.scene
    const h = HEAD_H + BODY_H + FOOT_H
    this.c = scene.add.container((1024 - PW) / 2, (768 - h) / 2)
      .setDepth(400).setScrollFactor(0).setVisible(false)

    this.c.add(scene.add.rectangle(PW / 2, h / 2, PW, h, 0x0b0e17, 0.95)
      .setStrokeStyle(2, 0xffcc00))

    this.title = scene.add.text(24, 18, '', {
      fontSize: '19px', fontFamily: 'Arial', color: '#ffcc00', fontStyle: 'bold'
    })
    this.sub = scene.add.text(PW - 24, 22, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#9fb4cc'
    }).setOrigin(1, 0)
    this.c.add([this.title, this.sub])

    this.headerTexts = []
    for (let i = 0; i < COLS; i++) {
      const t = scene.add.text(COL_X[i], HEAD_H - 22, '', {
        fontSize: '13px', fontFamily: 'Arial', color: '#8899aa'
      })
      this.headerTexts.push(t)
      this.c.add(t)
    }

    this.rowViews = []
    for (let i = 0; i < ROWS; i++) {
      const y = HEAD_H + i * ROW_H
      const hl = scene.add.rectangle(PW / 2, y + ROW_H / 2 - 4, PW - 16, ROW_H - 6, 0x1b2436, 0)
        .setStrokeStyle(1, 0x3d4f6b)
      const name = scene.add.text(24, y + 2, '', {
        fontSize: '14px', fontFamily: 'Arial', color: '#ffffff'
      })
      const sub = scene.add.text(24, y + 20, '', {
        fontSize: '11px', fontFamily: 'Arial', color: '#8899aa'
      })
      const cols = []
      for (let c = 0; c < COLS; c++) {
        const t = scene.add.text(COL_X[c], y + 8, '', {
          fontSize: '13px', fontFamily: 'Arial', color: '#cccccc'
        })
        cols.push(t)
      }
      this.c.add([hl, name, sub, ...cols])
      this.rowViews.push({ hl, name, sub, cols })
    }

    this.foot = scene.add.text(24, HEAD_H + BODY_H + 6, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
      wordWrap: { width: PW - 48 }
    })
    this.c.add(this.foot)

    this.hint = scene.add.text(24, HEAD_H + BODY_H + 44, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#8899aa'
    })
    this.c.add(this.hint)
  }

  // ---------- 开合 ----------

  openDevelop(focusId) {
    const cities = ownedCities()
    const idx = cities.findIndex(c => c.id === focusId)
    this.mode = 'develop'
    this.row = idx >= 0 ? idx : 0
    this.col = 0
    this.target = null
    this.view = CITY_VIEW
    this.c.setVisible(true)
    this.refresh()
  }

  // view 让同一套出兵面板也能服务野外讨伐（寨防/赏金口径不同）
  openSiege(target, onConfirm, view = CITY_VIEW) {
    this.mode = 'siege'
    this.target = target
    this.onConfirm = onConfirm
    this.view = view
    this.row = 0
    this.col = 0
    this.alloc = {}
    for (const city of ownedCities()) {
      this.alloc[city.id] = { infantry: 0, cavalry: 0 }
    }
    this.c.setVisible(true)
    this.refresh()
  }

  close() {
    this.mode = null
    this.target = null
    this.onConfirm = null
    this.view = CITY_VIEW
    this.c.setVisible(false)
    this.onClose?.()
  }

  // ---------- 输入 ----------

  handleKey(code) {
    if (!this.open) return false
    const cities = this.rows()
    if (this.mode === 'siege') return this.handleSiegeKey(code, cities)
    switch (code) {
      case 'ArrowUp':
        this.row = (this.row - 1 + cities.length) % cities.length
        return true
      case 'ArrowDown':
        this.row = (this.row + 1) % cities.length
        return true
      case 'ArrowLeft':
        this.col = (this.col + COLS - 1) % COLS
        return true
      case 'ArrowRight':
        this.col = (this.col + 1) % COLS
        return true
      case 'KeyE':
        this.confirm()
        return true
      case 'KeyF':
        this.train()
        return true
      case 'Escape':
      case 'KeyM':
        this.close()
        return true
    }
    return false
  }

  // 攻城模式：↑↓ 选城，←→ 调步兵，W/S 调骑兵，A 一键全军，Z 撤回，E 出兵。
  handleSiegeKey(code, cities) {
    if (!cities.length) return true
    switch (code) {
      case 'ArrowUp':
        this.row = (this.row - 1 + cities.length) % cities.length
        return true
      case 'ArrowDown':
        this.row = (this.row + 1) % cities.length
        return true
      case 'ArrowLeft':
        this.adjust('infantry', -1)
        return true
      case 'ArrowRight':
        this.adjust('infantry', 1)
        return true
      case 'KeyS':
        this.adjust('cavalry', -1)
        return true
      case 'KeyW':
        this.adjust('cavalry', 1)
        return true
      case 'KeyA':
        this.sendAll()
        return true
      case 'KeyZ':
        this.clearAll()
        return true
      case 'KeyE':
        this.confirmSiege()
        return true
      case 'Escape':
      case 'KeyM':
        this.close()
        return true
    }
    return false
  }

  adjust(key, dir) {
    const city = this.rows()[this.row]
    if (!city) return
    const a = this.alloc[city.id]
    if (!a) return
    const step = BATCH[key] * dir
    a[key] = Math.max(0, Math.min(city.troops[key], a[key] + step))
  }

  // 一键全军：所有城池把手上的人全押上去。
  // 已经押满时再按一次就直接开打——常见用法是"按 A、按 A"两下解决，
  // 但第一次仍然留了一手：玩家能先看清胜算再决定要不要真打。
  sendAll() {
    const cities = this.rows()
    if (!cities.length) return
    const full = cities.every(c => {
      const a = this.alloc[c.id]
      return a && a.infantry >= c.troops.infantry && a.cavalry >= c.troops.cavalry
    })
    if (full) {
      this.confirmSiege()
      return
    }
    let total = 0
    for (const c of cities) {
      this.alloc[c.id] = { infantry: c.troops.infantry, cavalry: c.troops.cavalry }
      total += troopCount(c)
    }
    this.scene.onPanelAction?.(`全军集结：${cities.length} 城共 ${total} 兵　再按 A 立即出兵`)
    this.refresh()
  }

  clearAll() {
    let had = false
    for (const city of this.rows()) {
      const a = this.alloc[city.id]
      if (!a) continue
      if (a.infantry || a.cavalry) had = true
      this.alloc[city.id] = { infantry: 0, cavalry: 0 }
    }
    if (had) this.scene.onPanelAction?.('已撤回全部兵力')
    this.refresh()
  }

  confirm() {
    if (this.mode === 'develop') this.upgrade()
    else if (this.mode === 'siege') this.confirmSiege()
  }

  // ---------- 城中整备 ----------

  upgrade() {
    const city = this.rows()[this.row]
    if (!city) return
    const key = BRANCHES[this.col].key
    if (applyUpgrade(city, key)) {
      this.scene.builder?.refreshBarracks()
      this.scene.onPanelAction?.(`${city.name} ${KEY_LABELS[key]} 升至 ${levelOf(city, key)} 级`)
    } else {
      this.scene.onPanelAction?.(
        levelOf(city, key) >= MAX_LEVEL ? '已达最高级' : '金币不足（需预留一笔军饷）'
      )
    }
    this.refresh()
  }

  train() {
    const city = this.rows()[this.row]
    if (!city) return
    const key = BRANCHES[this.col].key
    if (!BRANCH_BY_KEY[key]?.trainKey) {
      this.scene.onPanelAction?.(`${KEY_LABELS[key] || '此项'}不训练兵种（按 E 升级）`)
      return
    }
    if (troopCount(city) + BATCH[key] > troopCapacity(city)) {
      this.scene.onPanelAction?.('超出养兵上限，先升级军营提高税收')
      return
    }
    if (!canTrain(city, key)) {
      this.scene.onPanelAction?.('金币不足（需预留一笔军饷）')
      return
    }
    applyTrain(city, key)
    this.scene.onPanelAction?.(
      `${city.name} 征募 ${BATCH[key]} ${key === 'infantry' ? '步兵' : '骑兵'}`
    )
    this.refresh()
  }

  // ---------- 出兵攻城 ----------

  confirmSiege() {
    const flat = {}
    let any = false
    for (const city of ownedCities()) {
      const a = this.alloc[city.id]
      if (!a) continue
      const n = a.infantry + a.cavalry
      if (n > 0) {
        flat[city.id] = n
        any = true
      }
    }
    if (!any) {
      this.scene.onPanelAction?.('尚未派出任何兵力')
      return
    }
    const cb = this.onConfirm
    this.close()
    cb?.(flat)
  }

  // ---------- 渲染 ----------

  rows() {
    return ownedCities()
  }

  refresh() {
    if (!this.open) return
    // 城池可能在面板开着的时候易主，行数会变，光标要跟着收回来
    const n = this.rows().length
    if (this.row >= n) this.row = Math.max(0, n - 1)
    if (this.mode === 'develop') this.refreshDevelop()
    else this.refreshSiege()
  }

  refreshDevelop() {
    const cities = this.rows()
    this.title.setText('城 中 整 备')
    this.sub.setText(`金库 ${Math.floor(totalGold())}　总兵力 ${totalTroops()}`)

    // 表头跟着 BRANCHES 走，攻城模式另有三列（见 refreshSiege）
    BRANCHES.forEach((b, i) => {
      this.headerTexts[i].setText(KEY_LABELS[b.key])
      this.headerTexts[i].setX(COL_X[i])
      this.headerTexts[i].setVisible(true)
    })

    for (let i = 0; i < this.rowViews.length; i++) {
      const r = this.rowViews[i]
      const city = cities[i]
      if (!city) {
        r.hl.setFillStyle(0x1b2436, 0)
        r.name.setText('')
        r.sub.setText('')
        r.cols.forEach(t => t.setText(''))
        continue
      }
      const sel = i === this.row
      r.hl.setFillStyle(0x1b2436, sel ? 0.85 : 0)
      r.hl.setStrokeStyle(1, sel ? 0xffcc00 : 0x3d4f6b)

      r.name.setText(city.name)
      r.name.setColor(sel ? '#ffcc00' : '#ffffff')
      const load = Math.round(armyLoad(city) * 100)
      r.sub.setText(
        `金 ${Math.floor(city.gold)}　税 ${goldPerTick(city)}/2s　饷 ${upkeepPerTick(city).toFixed(2)}/2s　兵 ${troopCount(city)}/${troopCapacity(city)}（${load}%）　攻防系数 ×${(techFactor(city) * corpsFactor(city)).toFixed(2)}`
      )
      r.sub.setColor(load > 100 ? '#ff7777' : '#8899aa')

      BRANCHES.forEach((branch, c) => {
        const key = branch.key
        const lv = levelOf(city, key)
        const maxed = lv >= MAX_LEVEL
        const cost = maxed ? 0 : upgradeCost(city, key)
        const afford = !maxed && canUpgrade(city, key)
        const t = r.cols[c]
        const mark = sel && c === this.col ? '▶' : ' '
        const costTxt = maxed
          ? '已满级'
          : `Lv${lv}　升 ${cost}金`
        t.setText(`${mark}${KEY_LABELS[key]}  ${costTxt}`)
        t.setColor(maxed ? '#6f7f8f' : afford ? '#9be89b' : '#d08a8a')
        t.setY(HEAD_H + i * ROW_H + 8)
      })
    }

    const sel = cities[this.row]
    this.foot.setText(sel ? this.developHint(sel) : '')
    this.hint.setText('↑↓ 选城　←→ 选项目　[E] 升级　[F] 练兵　[M/Esc] 关闭')
  }

  developHint(city) {
    const key = BRANCHES[this.col].key

    // 城墙不产税也不带兵，收益全在守城战力上，单独说明。
    if (key === 'wall') {
      if (levelOf(city, key) >= MAX_LEVEL) {
        return `城墙 已是最高等级，当前守城战力 ${Math.round(defenderPower(city))}。`
      }
      const before = defenderPower(city)
      city.infra.wall += 1
      const after = defenderPower(city)
      city.infra.wall -= 1
      const cost = upgradeCost(city, 'wall')
      return `城墙 升一级后守城战力 ${Math.round(before)} → ${Math.round(after)}` +
        `（约 +${Math.round(((after / before) - 1) * 100)}%），需 ${cost} 金` +
        `（可负担：${spendableGold(city) >= cost ? '是' : '否'}）。`
    }

    // 兵力系数：不产税、不带兵，攻守两端同时上浮，是纯战力投资。
    if (key === 'corps') {
      const lv = levelOf(city, key)
      const now = corpsFactor(city)
      const next = 1 + CORPS_STEP * Math.min(MAX_LEVEL - 1, lv) 
      const cost = lv >= MAX_LEVEL ? null : upgradeCost(city, key)
      const step = `每级 +${Math.round(CORPS_STEP * 100)}%`
      if (cost == null) {
        return `兵力系数 已是最高等级 ×${now.toFixed(2)}，当前战力 野战 ${Math.round(cityPower(city))}` +
          `　守城 ${Math.round(defenderPower(city))}。`
      }
      return `兵力系数 升一级后 ×${now.toFixed(2)} → ×${next.toFixed(2)}（${step}，攻守双吃）。\n` +
        `野战战力 ${Math.round(cityPower(city))} → ${Math.round(cityPower(city) * next / now)}　` +
        `守城战力 ${Math.round(defenderPower(city))} → ${Math.round(defenderPower(city) * next / now)}` +
        `　需 ${cost} 金（可负担：${spendableGold(city) >= cost ? '是' : '否'}）。`
    }

    const trainKey = BRANCH_BY_KEY[key]?.trainKey || null
    // 用"假设升一级"的实际税收差值来说明收益，避免和真实公式脱节
    const before = goldPerTick(city)
    if (levelOf(city, key) < MAX_LEVEL) city.infra[key] += 1
    const gain = goldPerTick(city) - before
    if (levelOf(city, key) < MAX_LEVEL) city.infra[key] -= 1

    const parts = [
      `${KEY_LABELS[key]} 升一级后税收 ${before} → ${before + gain} 金/2s，可养 ${troopCapacity(city)} 兵。`
    ]
    if (trainKey) {
      const cost = trainCost(city, trainKey)
      parts.push(
        `练一次 ${BATCH[trainKey]} ${trainKey === 'infantry' ? '步兵' : '骑兵'} 需 ${cost} 金` +
        `（可负担：${spendableGold(city) >= cost ? '是' : '否'}）。`
      )
    }
    return parts.join('\n')
  }

  refreshSiege() {
    const cities = this.rows()
    const target = this.target
    const view = this.view || CITY_VIEW
    const isRaid = !!target?.raid
    this.title.setText(view.title(target))
    this.sub.setText(view.sub(target))

    this.headerTexts[0].setText('投入兵力')
    this.headerTexts[1].setText('该城总兵力')
    this.headerTexts[2].setText('投入战力')
    this.headerTexts[0].setX(COL_X[0])
    this.headerTexts[1].setX(COL_X[1])
    this.headerTexts[2].setX(COL_X[2])
    // 出兵只有三列，多出来的要藏掉，否则会露出上一次发展的表头
    for (let i = 3; i < this.headerTexts.length; i++) this.headerTexts[i].setVisible(false)

    for (let i = 0; i < this.rowViews.length; i++) {
      const r = this.rowViews[i]
      const city = cities[i]
      if (!city) {
        r.hl.setFillStyle(0x1b2436, 0)
        r.name.setText('')
        r.sub.setText('')
        r.cols.forEach(t => t.setText(''))
        continue
      }
      const sel = i === this.row
      r.hl.setFillStyle(0x1b2436, sel ? 0.85 : 0)
      r.hl.setStrokeStyle(1, sel ? 0xffcc00 : 0x3d4f6b)
      r.name.setText(city.name)
      r.name.setColor(sel ? '#ffcc00' : '#ffffff')
      r.sub.setText(`步 ${city.troops.infantry}　骑 ${city.troops.cavalry}`)

      const a = this.alloc[city.id] || { infantry: 0, cavalry: 0 }
      const n = a.infantry + a.cavalry
      const have = troopCount(city)
      const power = have > 0 ? Math.round(cityPower(city) * (n / have)) : 0
      r.cols[0].setText(`${sel ? '▶' : ' '}步${a.infantry} 骑${a.cavalry}（共 ${n}）`)
      r.cols[1].setText(`步${city.troops.infantry} 骑${city.troops.cavalry}`)
      r.cols[2].setText(`${power}`)
      r.cols[2].setColor(n > 0 ? '#9be89b' : '#6f7f8f')
      r.cols[0].setColor(n > 0 ? '#ffffff' : '#8899aa')
      r.cols[1].setColor('#8899aa')
      for (let c = 0; c < COLS; c++) r.cols[c].setY(HEAD_H + i * ROW_H + 8)
    }

    const flat = {}
    for (const city of cities) {
      const a = this.alloc[city.id]
      if (a) {
        const n = a.infantry + a.cavalry
        if (n > 0) flat[city.id] = n
      }
    }
    const p = view.preview(target, flat)
    const pct = Math.round(p.chance * 100)
    const verdict = p.committed === 0
      ? '未派兵'
        : p.chance <= 0
          ? (isRaid ? '战力不足，打不动' : '兵力不足，必败')
          : `胜算 ${pct}%${p.chance < 0.999 ? '（仍有风险）' : '（稳操胜券）'}`
    this.foot.setText(
      `投入 ${p.committed} 兵　战力 ${Math.round(p.attack)}　vs ${isRaid ? '寨防' : '城防'} ${Math.round(p.defend)}　` +
      `比值 ${p.ratio.toFixed(2)}　${verdict}` +
      (isRaid ? `　·　胜则收编 步${target.reward?.infantry ?? 0} 骑${target.reward?.cavalry ?? 0}、缴获 ${target.reward?.gold ?? 0} 金` : '')
    )
    this.foot.setColor(p.committed === 0 ? '#c8c0a8' : p.chance <= 0 ? '#e8a0a0' : p.chance < 0.7 ? '#e8d08a' : '#9be89b')
    this.hint.setText(`↑↓ 选城　←→ 步兵(10)　[W/S] 骑兵(5)　[A] 全军出击　[Z] 撤回　[E] ${isRaid ? '讨伐' : '出兵'}　[M/Esc] 取消`)
  }
}
