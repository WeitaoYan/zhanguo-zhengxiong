import { Scene, Math as PMath, Utils, Input } from 'phaser'
import {
  WORLD_W, WORLD_H, MOAT_W, buildTerrainMap, innerRect, lakeSolids,
  cityAt, gateInfo
} from '../world/layout.js'
import { GroundRenderer } from '../world/GroundRenderer.js'
import { CityBuilder, BARRACK_CN } from '../world/CityBuilder.js'
import { BattleFx } from '../world/BattleFx.js'
import { MonsterField } from '../world/MonsterField.js'
import { Hud } from '../ui/Hud.js'
import { Panel } from '../ui/Panel.js'
import { StageSelect } from '../ui/StageSelect.js'
import { TouchControls, isTouchPrimary } from '../ui/TouchControls.js'
import { CITIES, CITY_BY_ID, CAPITAL_ID, canAttack, ownedCities, totalTroops } from '../data/cities.js'
import {
  growAll, defenderPower, resolveBattle, troopCount,
  npcAssaultTick, declaredAssaults
} from '../data/military.js'
import { monsterKind, previewRaid, resolveRaid } from '../data/monsters.js'
import { applyStage, currentStage, monsterBoost } from '../data/stages.js'
import { difficultyOf } from '../data/difficulty.js'


const SPAWN = { x: 800, y: 960 }
const NPC_RANGE = 100
const GATE_RANGE = 130
const MONSTER_RANGE = 140
const WANDER_R = 40
const TICK_MS = 2000
const BARRACK_RANGE = 120

// 开局默认关卡：八家中等（第 4 关「狼烟四起」），也就是原来那套平衡。
const DEFAULT_STAGE = 3


export class WorldScene extends Scene {
  constructor() {
    super('WorldScene')
    this.isTalking = false
    this.currentNPC = null
    this.dialogueIndex = 0
    this.currentCity = null
    this.lastPlace = ''
    // 选关界面打开时冻结时间与操作（见 economyTick / update）
    this.selecting = false
    this.stageSelect = null
    this.field = null
  }

  create() {
    // 触屏优先的设备（手机/平板）走触屏操控，桌面端保持键鼠不变
    this.isTouch = isTouchPrimary()
    this._touchVisible = false

    // 先定关卡：归属、兵力、军营等级、各城难度都由它决定，
    // 必须在建城（城门落闸/开门跟着归属走）之前落定。
    applyStage(DEFAULT_STAGE)

    this.terrain = buildTerrainMap()
    this.ground = new GroundRenderer(this, this.terrain)
    this.builder = new CityBuilder(this, this.ground).buildAll()
    this.blockLakes()

    this.createPlayer()
    this.setupCamera()
    this.hud = new Hud(this, { touch: this.isTouch })
    this.panel = new Panel(this, { touch: this.isTouch })
    this.panel.onClose = () => this.unlockPlayer()
    this.fx = new BattleFx(this)
    this.field = new MonsterField(this, this.terrain, this.builder)
      .build(currentStage(), monsterBoost())
    this.setupControls()
    this.setupNpcLoop()
    this.setupEconomy()

    this.hud.refreshLedger()

    this.createInteractionUi()
    // 触屏操控：左侧摇杆移动，右侧按钮映射 E/F/C/M/L
    if (this.isTouch) {
      this.touch = new TouchControls(this, code => this.routeKey(code))
      this.touch.setVisible(false)
      // 对话框点按继续，不用再找按键
      this.hud.onDialogueTap = () => {
        if (this.isTalking && !this.stageSelect?.open) this.advanceDialogue()
      }
    }
    // 开场不是一句话就放人，而是先让玩家选一关：难度不同，玩法差别很大
    this.stageSelect = new StageSelect(this, {
      touch: this.isTouch,
      confirm: index => this.startStage(index),
      // 中途按 L 打开后又能取消：必须把"选关中"的冻结状态解开，
      // 否则玩家会卡在一个看不见的暂停里。
      cancel: () => {
        this.selecting = false
        this.unlockPlayer()
      }
    })
    this.stageSelect.show(true)
    this.selecting = true

    // ?debug=1 临时诊断：统计 DOM 层 vs Phaser 层的 pointerdown，
    // 定位"点击无反应"是事件没进页面还是没进 Phaser。
    // 诊断完就删掉，不进正式版本。
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      const st = { dom: 0, phaser: 0 }
      window.addEventListener('pointerdown', () => st.dom++, true)
      this.input.on('pointerdown', () => st.phaser++)
      const dbg = this.add.text(8, 648, '', {
        fontSize: '13px', fontFamily: 'monospace', color: '#00ff00',
        backgroundColor: 'rgba(0,0,0,0.8)', padding: { x: 6, y: 4 },
        lineSpacing: 4
      }).setScrollFactor(0).setDepth(999)
      this.time.addEvent({
        delay: 400,
        loop: true,
        callback: () => {
          const ss = this.stageSelect
          const r0 = ss?.rows[0]?.hl
          dbg.setText(
            `domDown=${st.dom} phaserDown=${st.phaser} input.enabled=${this.input.enabled}\n` +
            `touch=${this.isTouch} ss.visible=${ss?.visible} c.visible=${ss?.c.visible}\n` +
            `row.input=${!!r0?.input} row.enabled=${!!(r0?.input && r0.input.enabled)}\n` +
            `btn.input=${!!(ss?.startBtn && ss.startBtn.bg.input)}`
          )
        }
      })
    }
  }

  // 每 2 秒推进一次：玩家城池收税并发饷，NPC 城池自行发展，
  // 同时推进 NPC 的主动出兵（宣战倒计时 / 接战结算，见 military.js）。
  // 欠饷会掉兵，所以"放着不管"本身也是一种决策。
  setupEconomy() {
    this.tick = 0
    this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => this.economyTick()
    })
  }

  economyTick() {
    // 选关界面开着时不推进时间：否则玩家还在读关卡说明，NPC 已经在发育了
    if (this.selecting) return
    growAll()
    this.tick += 1
    for (const ev of this.field.tick()) this.handleCampEvent(ev)
    for (const ev of npcAssaultTick(this.tick)) this.handleNpcEvent(ev)
    if (this.hud) {
      this.hud.refreshLedger()
      this.hud.setAlert(declaredAssaults())
    }
  }

  // 荡平的营寨过一阵会重新聚起（等级还比上一窝高一级）
  handleCampEvent(ev) {
    if (ev.kind === 'respawn') {
      this.showToast(`野外的${ev.camp.name}又聚起来了（寨防 ${ev.camp.power}）`)
    }
  }

  // 荒野湖泊也要挡人，否则玩家能在水面上走；
  // 但官道横穿湖泊，必须先从碰撞区里挖掉，否则路会被封死。
  blockLakes() {
    for (const r of lakeSolids(this.terrain)) {
      this.builder.addSolid(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h)
    }
  }

  createPlayer() {
    const home = CITY_BY_ID.c1
    const r = innerRect(home)
    this.player = this.physics.add.sprite(r.x + SPAWN.x, r.y + SPAWN.y, 'player_down_0')
    this.player.setDepth(20)
    this.player.setCollideWorldBounds(true)
    this.player.body.setSize(16, 20)
    this.player.body.setOffset(8, 24)

    this.playerDir = 'down'
    this.playerFrame = 0
    this.playerSpeed = 170

    this.physics.add.collider(this.player, this.builder.solids)
    this.physics.add.collider(this.player, this.builder.npcs)

    this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => this.animatePlayer()
    })
  }

  setupCamera() {
    const cam = this.cameras.main
    cam.setBounds(0, 0, WORLD_W, WORLD_H)
    cam.startFollow(this.player, true, 0.09, 0.09)
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H)
  }

  setupControls() {
    // 纯触屏环境下 keyboard 插件可能不存在，守卫一下
    const kb = this.input.keyboard
    if (!kb) return
    this.cursors = kb.createCursorKeys()
    this.wasd = kb.addKeys({
      up: Input.Keyboard.KeyCodes.W,
      down: Input.Keyboard.KeyCodes.S,
      left: Input.Keyboard.KeyCodes.A,
      right: Input.Keyboard.KeyCodes.D
    })
    this.interactKey = kb.addKey(Input.Keyboard.KeyCodes.E)
    this.attackKey = kb.addKey(Input.Keyboard.KeyCodes.F)
    this.ledgerKey = kb.addKey(Input.Keyboard.KeyCodes.M)
    this.developKey = kb.addKey(Input.Keyboard.KeyCodes.C)
    this.stageKey = kb.addKey(Input.Keyboard.KeyCodes.L)

    this.interactKey.on('down', () => this.routeKey('KeyE'))
    this.attackKey.on('down', () => this.routeKey('KeyF'))
    this.ledgerKey.on('down', () => this.routeKey('KeyM'))
    this.developKey.on('down', () => this.routeKey('KeyC'))
    this.stageKey.on('down', () => this.routeKey('KeyL'))

    // 面板需要方向键和 Esc。Phaser 的逐键事件名是 'keydown-' + 键名
    // （如 keydown-UP、keydown-ESC），不是键码数字，所以这里必须写名字。
    const panelKeys = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      Escape: 'ESC',
      KeyW: 'W',
      KeyS: 'S',
      // 出兵面板：A 一键全军，Z 全部撤回
      KeyA: 'A',
      KeyZ: 'Z'
    }
    for (const [name, keyName] of Object.entries(panelKeys)) {
      this.input.keyboard.on(`keydown-${keyName}`, ev => {
        // 选关界面自己接管全部按键（它自带 keydown 监听）
        if (this.stageSelect?.open) return
        if (this.panel?.handleKey(name)) ev.preventDefault()
      })
    }
  }

  // 面板打开时所有快捷键都交给面板，避免同时触发对话/攻城
  routeKey(code) {
    // 选关界面的按键走它自己的监听器（见 StageSelect.show），这里必须让开，
    // 否则同一次按键会被处理两遍。
    if (this.stageSelect?.open) return
    if (this.panel?.open) {
      this.panel.handleKey(code)
      return
    }
    if (code === 'KeyE') this.handleInteract()
    else if (code === 'KeyF') this.handleAttackKey()
    else if (code === 'KeyM') this.hud.toggleLedger()
    else if (code === 'KeyC') this.openDevelopPanel()
    else if (code === 'KeyL') this.openStageSelect()
  }

  // 按键提示文案：桌面显示 [E]，触屏显示对应的动作按钮名
  keyTip(code, text) {
    if (!this.isTouch) return `[${code}] ${text}`
    const name = { E: '交谈', F: '出兵', C: '整备', M: '名册', L: '关卡' }[code] || code
    return `「${name}」${text}`
  }

  // ---------- 关卡 ----------
  openStageSelect() {
    if (this.fx?.active) return
    this.closeDialogue()
    this.lockPlayer()
    this.selecting = true
    this.stageSelect.show(false)
  }

  // 确认关卡：重铺数据，再把世界表现整片刷回来。
  // 城池归属、城门落闸、军营星级、野外营寨、小地图、名册全部要跟着走。
  startStage(index) {
    this.selecting = false
    applyStage(index)
    this.tick = 0
    this.lastPlace = ''
    this.currentCity = null

    for (const gate of this.builder.gates) this.builder.applyGateState(gate)
    for (const gate of this.builder.gates) {
      if (gate.city.owner === 'player') this.openGate(gate)
    }
    this.builder.refreshBarracks()
    this.field.build(currentStage(), monsterBoost())

    // 玩家回青禾城门口重新开始
    const home = CITY_BY_ID[CAPITAL_ID]
    const r = innerRect(home)
    this.player.body.reset(r.x + SPAWN.x, r.y + SPAWN.y)
    this.player.body.enable = true
    this.playerDir = 'down'
    this.player.setTexture('player_down_0')

    this.hud.redrawMap()
    this.hud.refreshLedger()
    if (this.panel?.open) this.panel.close()
    this.unlockPlayer()

    const stage = currentStage()
    this.hud.showBanner(
      `第${stage.rank}关　${stage.name}`,
      `${stage.tag}　·　野外营寨 ${this.field.aliveCount()} 处　·　${stage.desc}`,
      0xffcc33
    )
    this.showToast(`关卡开始：${stage.name}　${stage.tag}`)
  }

  openDevelopPanel() {
    const cities = ownedCities()
    if (!cities.length) return
    // 优先整备脚下的城；人不在自己城里就整备根基之地青禾城
    const here = cityAt(this.player.x, this.player.y)
    const focus = here && here.owner === 'player'
      ? here
      : cities.find(c => c.id === CAPITAL_ID) || cities[0]
    this.lockPlayer()
    this.panel.openDevelop(focus.id)
  }

  // 面板里的操作反馈走提示条，和场景提示保持一致
  onPanelAction(msg) {
    this.showToast(msg)
  }

  setupNpcLoop() {
    this.time.addEvent({ delay: 420, loop: true, callback: () => this.wanderNpcs() })
    this.time.addEvent({ delay: 190, loop: true, callback: () => this.animateNpcs() })
  }

  // ---------- NPC ----------
  wanderNpcs() {
    for (const npc of this.builder.npcs) {
      if (!npc.wander) continue
      if (this.isTalking && this.currentNPC === npc) continue

      if (npc.moveTimer > 0) {
        npc.moveTimer--
        npc.body.setVelocity(npc.moveDir.x * 34, npc.moveDir.y * 34)
        npc.isMoving = true
        if (Math.abs(npc.moveDir.x) > Math.abs(npc.moveDir.y)) {
          npc.npcDir = npc.moveDir.x > 0 ? 'right' : 'left'
        } else {
          npc.npcDir = npc.moveDir.y > 0 ? 'down' : 'up'
        }
        if (PMath.Distance.Between(npc.x, npc.y, npc.homeX, npc.homeY) > WANDER_R) {
          npc.moveDir = { x: npc.homeX - npc.x, y: npc.homeY - npc.y }
          const len = Math.hypot(npc.moveDir.x, npc.moveDir.y) || 1
          npc.moveDir.x = (npc.moveDir.x / len) * -1
          npc.moveDir.y = (npc.moveDir.y / len) * -1
          npc.moveTimer = Math.min(npc.moveTimer, 2)
        }
      } else {
        npc.body.setVelocity(0)
        npc.isMoving = false
        if (--npc.idleTimer <= 0) {
          npc.moveDir = Utils.Array.GetRandom([
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
          ])
          npc.moveTimer = PMath.Between(2, 5)
          npc.idleTimer = PMath.Between(3, 9)
        }
      }
    }
  }

  animateNpcs() {
    for (const npc of this.builder.npcs) {
      if (npc.isMoving) npc.npcFrame = (npc.npcFrame + 1) % 4
      else npc.npcFrame = 0
      npc.setTexture(`npc_${npc.npcKey}_${npc.npcDir}_${npc.npcFrame}`)
    }
  }

  animatePlayer() {
    const moving = this.player.body.velocity.length() > 12 && !this.isTalking
    this.playerFrame = moving ? (this.playerFrame + 1) % 4 : 0
    this.player.setTexture(`player_${this.playerDir}_${this.playerFrame}`)
  }

  // ---------- 交互 ----------
  createInteractionUi() {
    this.indicator = this.add.image(0, 0, 'indicator').setDepth(60).setVisible(false)
    this.closeLabel = this.add.text(0, 0, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffcc00',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 7, y: 3 }
    }).setOrigin(0.5).setDepth(61).setVisible(false)
    this.toast = this.add.text(512, 130, '', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(140).setScrollFactor(0).setAlpha(0)
  }

  handleInteract() {
    if (this.isTalking) {
      this.advanceDialogue()
      return
    }
    const target = this.findClosest()
    if (!target) return
    if (target.kind === 'gate') this.openGateDialogue(target.gate)
    else if (target.kind === 'barrack') this.openDevelopPanel()
    else if (target.kind === 'monster') this.openMonsterDialogue(target.camp)
    else this.openNpcDialogue(target.npc)
  }

  handleAttackKey() {
    const kind = this.currentTarget?.kind
    if (this.isTalking && kind === 'monster') {
      this.openRaid(this.currentTarget.camp)
      return
    }
    if (!this.isTalking || kind !== 'gate') {
      this.showToast('走到敌城门前按 E 与守卫交涉后再出兵；野外营寨同理，按 E 查看后按 F 讨伐')
      return
    }
    const city = this.currentTarget.gate.city
    if (city.owner === 'player') {
      this.showToast('这已经是你的城池了')
      return
    }
    if (!canAttack(city.id, this.ownedIds())) {
      this.showToast(`${city.name}与你的领地不相邻，无法攻打`)
      return
    }
    const gate = this.currentTarget.gate
    this.closeDialogue()
    this.lockPlayer()
    this.panel.openSiege(city, alloc => this.resolveSiege(gate, city, alloc))
  }

  // 面板确认后真正结算：伤亡、归属、开门、地图刷新都在这里发生。
  // 玩家控制权由 Panel.close() -> onClose 交还；若带过场动画则延后到演完。
  resolveSiege(gate, city, allocation) {
    // 先记下双方骑兵占比，动画要按交战前的兵种配比来摆阵
    let cavN = 0
    for (const [cityId, n] of Object.entries(allocation)) {
      const c = CITY_BY_ID[cityId]
      if (c?.owner === 'player' && n > 0) cavN += Math.min(n, troopCount(c)) * (c.troops.cavalry / Math.max(1, troopCount(c)))
    }
    const defTotal = Math.max(1, troopCount(city))
    // Snapshot the defender mix BEFORE the battle rewrites the garrison,
    // otherwise the cutscene animates the post-battle composition.
    const defCav = city.troops.cavalry / defTotal
    const result = resolveBattle(city, allocation)
    // 面板关闭会解锁角色，这里重新锁住，等过场动画演完再交还控制权
    this.lockPlayer()
    this.fx.play({
      gate,
      result: { ...result, atkCav: cavN / Math.max(1, result.committed), defCav },
      onDone: () => this.finishSiege(gate, city, result)
    })
  }

  // 动画演完后再落地：开门、刷地图、播报横幅
  finishSiege(gate, city, result) {
    this.unlockPlayer()

    if (!result.win) {
      this.hud.showBanner(
        `${city.name} 攻之不下`,
        `投入战力 ${Math.round(result.attack)}　vs 城防 ${Math.round(result.defend)}` +
        `（比值 ${result.ratio.toFixed(2)}，胜算 ${Math.round(result.chance * 100)}%）　损 ${result.lost} 兵`,
        0xff7777
      )
      return
    }

    for (const g of this.builder.gates) {
      if (g.city === city) this.openGate(g)
    }
    for (const npc of this.builder.npcs) {
      if (npc.gateCity === city) npc.setVisible(false)
    }

    this.hud.redrawMap()
    this.hud.refreshLedger()
    this.builder.refreshBarracks()
    this.hud.showBanner(
      `${city.name} 归你了`,
      `投入 ${result.committed} 兵，胜算 ${Math.round(result.chance * 100)}%，损 ${result.lost}　·　` +
      `守军降为 步${city.troops.infantry} 骑${city.troops.cavalry}　·　` +
      `领地 ${this.ownedIds().length}/${CITIES.length}`,
      city.color
    )
    if (gate) this.flashCapture(gate)
  }

  // ---------- 野外讨伐 ----------
  // 小怪不走城门那套：走到营寨边按 E 看一眼，再按 F 拉出同一块出兵面板，
  // 分配兵力、看胜算、开打，和攻城一模一样——只是对面换成了狼群与山贼。
  openMonsterDialogue(camp) {
    this.isTalking = true
    this.currentNPC = null
    this.currentTarget = { kind: 'monster', camp }
    this.dialogueIndex = 0
    this.lockPlayer()
    this.faceTowards(camp.x, camp.y)
    const lines = this.monsterLines(camp)
    this.hud.openDialogue(camp.name, lines, this.keyTip('F', '讨伐'))
  }

  monsterLines(camp) {
    const kind = monsterKind(camp)
    const r = camp.reward
    return [
      kind.desc,
      `寨防 ${camp.power}。讨伐得手可收编 步${r.infantry} 骑${r.cavalry}，另缴获 ${r.gold} 金。`,
      '收编的兵员受养兵上限约束，超编的部分会折价充公；打输了则照常折损。'
    ]
  }

  openRaid(camp) {
    this.closeDialogue()
    this.lockPlayer()
    const r = camp.reward
    this.panel.openSiege(camp, alloc => this.resolveRaidCombat(camp, alloc), {
      defend: t => t.power,
      preview: (t, alloc) => previewRaid(t, alloc),
      title: t => `讨 伐 · ${t.name}`,
      sub: t => `寨防 ${t.power}　${monsterKind(t).name}　胜则收编 步${r.infantry} 骑${r.cavalry}、缴获 ${r.gold} 金`
    })
  }

  // 交战场地就在营寨门口，进攻方向取"玩家所在的那一侧"，
  // 这样动画里的我军总是从玩家站着的一边压上去。
  sideFromPlayer(p) {
    const dx = this.player.x - p.x
    const dy = this.player.y - p.y
    if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'e' : 'w'
    return dy >= 0 ? 's' : 'n'
  }

  resolveRaidCombat(camp, allocation) {
    let cavN = 0
    for (const [cityId, n] of Object.entries(allocation)) {
      const c = CITY_BY_ID[cityId]
      if (c?.owner === 'player' && n > 0) {
        cavN += Math.min(n, troopCount(c)) * (c.troops.cavalry / Math.max(1, troopCount(c)))
      }
    }
    const result = resolveRaid(camp, allocation)
    this.lockPlayer()
    this.fx.play({
      gate: { side: this.sideFromPlayer(camp), x: camp.x, y: camp.y - 12 },
      result: { ...result, atkCav: cavN / Math.max(1, result.committed), defCav: 0 },
      monsterKey: camp.kind,
      onDone: () => this.finishRaid(camp, result)
    })
  }

  finishRaid(camp, result) {
    this.unlockPlayer()

    if (!result.win) {
      this.hud.showBanner(
        `${camp.name} 讨伐失利`,
        `投入 ${result.committed} 兵　战力 ${Math.round(result.attack)} vs 寨防 ${Math.round(result.defend)}` +
        `（比值 ${result.ratio.toFixed(2)}，胜算 ${Math.round(result.chance * 100)}%）　损 ${result.lost} 兵`,
        0xff7777
      )
      this.showToast('讨伐失利，收兵回城')
      return
    }

    const reward = result.reward || { infantry: 0, cavalry: 0, gold: 0, overflowGold: 0 }
    this.field.clear(camp)
    this.hud.refreshLedger()
    this.hud.showBanner(
      `荡平 ${camp.name}`,
      `收编 步${reward.infantry} 骑${reward.cavalry}　缴获 ${reward.gold} 金` +
      (reward.overflowGold ? `（超编折金 ${reward.overflowGold}）` : '') +
      `　损 ${result.lost} 兵　·　剩余营寨 ${this.field.aliveCount()} 处`,
      0x9be89b
    )
    this.showToast(
      `讨伐得胜：兵力 +${reward.infantry + reward.cavalry}` +
      (reward.overflowGold ? `，超编折金 ${reward.overflowGold}` : '')
    )
  }

  // ---------- NPC 来犯 ----------
  // 事件由 military.js 的 npcAssaultTick 产生，这里只负责播报与刷新世界表现。
  handleNpcEvent(ev) {
    const a = ev.attacker
    const t = ev.target

    if (ev.kind === 'warn') {
      this.hud.showBanner(
        `${a.name} 出兵来犯`,
        `目标 ${t.name}　敌军战力 ${Math.round(ev.attack)} vs 城防 ${Math.round(ev.defend)}　` +
        `${Math.round(ev.seconds)} 秒后接战　·　增援或修墙可逼其退兵`,
        0xff7777
      )
      this.showToast(`敌袭！${a.lord} 的兵马直奔 ${t.name}，抓紧增援`)
      return
    }

    // 目标已经不是玩家的城，或城防太硬 → 敌军收兵
    if (ev.kind === 'withdraw') {
      this.hud.showBanner(
        ev.standDown ? `${a.name} 收兵` : `${a.name} 退兵`,
        ev.standDown
          ? `${t ? t.name : '目标'} 已不在你手中，敌军只好另寻去处。`
          : `${t.name} 城防森严，敌军讨不到便宜，收兵回去了。`,
        0x9be89b
      )
      return
    }

    if (!ev.win) {
      this.hud.showBanner(
        `${t.name} 守住了`,
        `${a.name} 来犯被击退　·　敌军折损 ${ev.lost} 兵　·　守军 步${t.troops.infantry} 骑${t.troops.cavalry}`,
        0x9be89b
      )
      if (this.isInside(t)) this.shakeCity()
      this.refreshCityWorld(t)
      return
    }

    if (ev.loot > 0) {
      this.hud.showBanner(
        `${t.name} 遭劫掠`,
        `${a.name}城主${a.lord} 破城而入，掠走 ${ev.loot} 金　·　` +
        `守军降为 步${t.troops.infantry} 骑${t.troops.cavalry}（根基之地不会易主）`,
        0xff9a5a
      )
      if (this.isInside(t)) this.shakeCity()
      this.refreshCityWorld(t)
      return
    }

    this.hud.showBanner(
      `${t.name} 失守`,
      `${a.name}城主${a.lord} 夺了此城　·　敌军折损 ${ev.lost} 兵　·　` +
      `领地 ${this.ownedIds().length}/${CITIES.length}`,
      0xff7777
    )
    this.refreshCityWorld(t)
    if (this.isInside(t)) this.ejectPlayer(t)
  }

  // 城池易主后补齐世界表现：城门落闸/开门、军营配色、小地图与名册
  refreshCityWorld(city) {
    for (const g of this.builder.gates) {
      if (g.city === city) this.builder.applyGateState(g)
    }
    this.builder.refreshBarracks()
    this.hud.redrawMap()
    this.hud.refreshLedger()
    if (this.panel?.open) this.panel.refresh()
  }

  isInside(city) {
    return cityAt(this.player.x, this.player.y) === city
  }

  shakeCity() {
    this.cameras.main.shake(320, 0.006)
  }

  // 城破时玩家若正在城内，会被赶到南门外的官道上：
  // 否则城门落闸，玩家就被自己的城墙困死在城里了。
  ejectPlayer(city) {
    const g = gateInfo(city, 's')
    // body.reset 会把角色和物理体一起挪走（角色可能正处于锁定状态）
    this.player.body.reset(g.moat.x, g.moat.y + MOAT_W / 2 + 48)
    this.showToast('城破了，你被逐出城外')
  }

  unlockPlayer() {
    this.isTalking = false
    this.currentNPC = null
    this.currentTarget = null
    this.dialogueIndex = 0
    this.hud.closeDialogue()
    this.player.body.enable = true
  }

  findClosest() {
    let best = null
    let bestDist = Infinity

    for (const npc of this.builder.npcs) {
      if (npc.gateCity) continue
      const d = PMath.Distance.Between(this.player.x, this.player.y, npc.x, npc.y)
      if (d < NPC_RANGE && d < bestDist) {
        bestDist = d
        best = { kind: 'npc', npc }
      }
    }

    for (const gate of this.builder.gates) {
      const d = PMath.Distance.Between(this.player.x, this.player.y, gate.x, gate.y)
      if (d < GATE_RANGE && d < bestDist) {
        bestDist = d
        best = { kind: 'gate', gate }
      }
    }

    for (const bar of this.builder.barracks) {
      if (bar.city.owner !== 'player') continue
      const d = PMath.Distance.Between(this.player.x, this.player.y, bar.x, bar.y)
      if (d < BARRACK_RANGE && d < bestDist) {
        bestDist = d
        best = { kind: 'barrack', barrack: bar }
      }
    }

    // 野外营寨：站在营地边上就能查看与讨伐
    const camp = this.field?.findNearest(this.player.x, this.player.y, MONSTER_RANGE)
    if (camp) {
      const d = PMath.Distance.Between(this.player.x, this.player.y, camp.x, camp.y)
      if (d < bestDist) {
        bestDist = d
        best = { kind: 'monster', camp }
      }
    }

    return best
  }

  openNpcDialogue(npc) {
    this.isTalking = true
    this.currentNPC = npc
    this.currentTarget = { kind: 'npc', npc }
    this.dialogueIndex = 0
    this.lockPlayer()
    this.faceTowards(npc.x, npc.y)
    this.hud.openDialogue(npc.npcData.name, npc.npcData.lines)
  }

  openGateDialogue(gate) {
    const city = gate.city
    const owned = this.ownedIds()
    const status = Hud.gateStatus(city)
    const diff = difficultyOf(city)
    const sideName = { n: '北门', s: '南门', w: '西门', e: '东门' }[gate.side]

    let line2
    let hint = this.keyTip('E', '结束')
    if (status.state === 'own') {
      line2 = '此处已是你的产业，四门随时为你敞开。'
    } else if (status.state === 'attackable') {
      const mine = totalTroops()
      const def = Math.round(defenderPower(city))
      line2 = `此城与你的领地接壤，可以出兵攻打。\n` +
        `难度【${diff.name}】　守军 步${city.troops.infantry} 骑${city.troops.cavalry}，城防 ${def}。\n` +
        `我军总兵力 ${mine}。${this.aggressionHint(diff)}`
      hint = `${this.keyTip('E', '结束')}   ${this.keyTip('F', `出兵攻打（守方城防 ${def}）`)}`
    } else {
      line2 = '此城与你的领地并不相邻。\n兵不相接，强攻只会自取其辱。'
    }

    this.isTalking = true
    this.currentNPC = null
    this.currentTarget = { kind: 'gate', gate }
    this.dialogueIndex = 0
    this.lockPlayer()
    this.faceTowards(gate.x, gate.y)
    this.hud.openDialogue(`${city.name}·${sideName}`, [
      `城主${city.lord}麾下重地，外人不得擅入。`,
      line2,
      status.state === 'own' ? city.intro : '再会。'
    ], hint)
  }

  // 把难度翻译成一句人话，让玩家在出兵前就知道这位城主有多主动
  aggressionHint(diff) {
    const a = diff.assault
    return `此人来犯门槛 ${a.edge}×，约 ${Math.round(a.warn * 2)} 秒接战，可同时出兵 ${a.concurrent} 路。`
  }

  advanceDialogue() {
    const lines = this.dialogueLines()
    this.dialogueIndex++
    if (this.dialogueIndex >= lines.length) {
      this.closeDialogue()
      return
    }
    const hint = this.currentTarget.kind === 'gate' && this.dialogueIndex === 1
      ? this.gateHint(this.currentTarget.gate)
      : this.keyTip('E', '继续')
    this.hud.setDialogueLine(lines[this.dialogueIndex], hint)
  }

  dialogueLines() {
    if (this.currentTarget.kind === 'npc') return this.currentTarget.npc.npcData.lines
    if (this.currentTarget.kind === 'monster') return this.monsterLines(this.currentTarget.camp)
    const city = this.currentTarget.gate.city
    const status = Hud.gateStatus(city)
    if (status.state === 'own') {
      return [`城主${city.lord}麾下重地，外人不得擅入。`, '此处已是你的产业，四门随时为你敞开。', city.intro]
    }
    if (status.state === 'attackable') {
      const diff = difficultyOf(city)
      const def = Math.round(defenderPower(city))
      return [
        `城主${city.lord}麾下重地，外人不得擅入。`,
        `此城与你的领地接壤，可以出兵攻打。\n` +
          `难度【${diff.name}】　守军 步${city.troops.infantry} 骑${city.troops.cavalry}，城防 ${def}。\n` +
          `我军总兵力 ${totalTroops()}。${this.aggressionHint(diff)}`,
        '不过……你若不来，城主早晚也要去敲你的城门。'
      ]
    }
    return [
      `城主${city.lord}麾下重地，外人不得擅入。`,
      '此城与你的领地并不相邻。\n兵不相接，强攻只会自取其辱。',
      '等你打下一座邻城，再来敲门不迟。'
    ]
  }

  gateHint(gate) {
    if (Hud.gateStatus(gate.city).state === 'attackable') {
      const def = Math.round(defenderPower(gate.city))
      return `${this.keyTip('E', '结束')}   ${this.keyTip('F', `出兵攻打（守方城防 ${def}）`)}`
    }
    return this.keyTip('E', '结束')
  }

  closeDialogue() {
    this.isTalking = false
    this.currentNPC = null
    this.currentTarget = null
    this.dialogueIndex = 0
    this.hud.closeDialogue()
    this.player.body.enable = true
  }

  lockPlayer() {
    this.player.body.setVelocity(0)
    this.player.body.enable = false
  }

  faceTowards(x, y) {
    const a = PMath.Angle.Between(x, y, this.player.x, this.player.y)
    if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) {
      this.playerDir = Math.cos(a) > 0 ? 'right' : 'left'
    } else {
      this.playerDir = Math.sin(a) > 0 ? 'down' : 'up'
    }
    this.player.setTexture(`player_${this.playerDir}_0`)
  }

  // ---------- 占领 ----------
  ownedIds() {
    return CITIES.filter(c => c.owner === 'player').map(c => c.id)
  }

  openGate(gate) {
    const idx = this.builder.solids.indexOf(gate.barrierBody)
    if (idx >= 0) this.builder.solids.splice(idx, 1)
    if (gate.barrierBody) gate.barrierBody.destroy()
    gate.barrierBody = null
    if (gate.barrier) {
      gate.barrier.destroy()
      gate.barrier = null
    }
    gate.guard.setVisible(false)
    gate.guard.body.enable = false
  }

  flashCapture(gate) {
    const g = gateInfo(gate.city, gate.side)
    const ring = this.add.circle(g.wall.x, g.wall.y, 20, 0xffffff, 0.7).setDepth(80)
    this.tweens.add({
      targets: ring,
      scale: 11,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy()
    })
  }

  showToast(text) {
    this.toast.setText(text)
    this.tweens.killTweensOf(this.toast)
    this.toast.setAlpha(1)
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 900, duration: 500 })
  }

  // ---------- 主循环 ----------
  update() {
    this.ground.refresh(this.cameras.main)
    if (this.selecting) {
      this.indicator?.setVisible(false)
      this.closeLabel?.setVisible(false)
      if (this.touch && this._touchVisible) {
        this._touchVisible = false
        this.touch.setVisible(false)
      }
      return
    }
    this.handleMovement()
    this.updateInteraction()
    this.updatePlace()
    this.hud.update(this.ownedIds().length, this.lastPlace, this.player.x, this.player.y, {
      camps: this.field?.aliveCount()
    })
    if (this.panel.open) this.panel.refresh()
    // 触屏键只在能操作时出现：面板/选关/战斗动画时藏起来
    if (this.touch) {
      const show = !this.panel.open && !this.fx?.active
      if (show !== this._touchVisible) {
        this._touchVisible = show
        this.touch.setVisible(show)
      }
    }
  }

  handleMovement() {
    if (this.isTalking) return
    if (this.selecting) return
    if (this.panel?.open) return
    if (this.fx?.active) return
    let vx = 0
    let vy = 0
    const joy = this.touch?.moveVec
    if (joy && (joy.x !== 0 || joy.y !== 0)) {
      // 触屏摇杆：模拟量直接驱动，推满即全速
      vx = joy.x
      vy = joy.y
    } else if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1
      else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1
      else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707
        vy *= 0.707
      }
    }
    this.player.body.setVelocity(vx * this.playerSpeed, vy * this.playerSpeed)

    if (vx !== 0 || vy !== 0) {
      this.playerDir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up')
    }
  }

  updateInteraction() {
    if (this.isTalking || this.selecting || this.panel?.open || this.fx?.active) {
      this.indicator.setVisible(false)
      this.closeLabel.setVisible(false)
      return
    }
    const target = this.findClosest()
    if (!target) {
      this.indicator.setVisible(false)
      this.closeLabel.setVisible(false)
      return
    }

    const pos = target.kind === 'gate'
      ? { x: target.gate.x, y: target.gate.y - 40 }
      : target.kind === 'barrack'
        ? { x: target.barrack.x, y: target.barrack.y - 46 }
        : target.kind === 'monster'
          ? { x: target.camp.x, y: target.camp.y - 96 }
          : { x: target.npc.x, y: target.npc.y }
    this.indicator.setPosition(pos.x, pos.y + Math.sin(this.time.now / 280) * 3).setVisible(true)

    const act = this.isTouch ? '交谈' : '[E]'
    const label = target.kind === 'gate'
      ? `${act} ${target.gate.city.name}${sideCn(target.gate.side)}`
      : target.kind === 'barrack'
        ? `${act} ${BARRACK_CN[target.barrack.key]} · 整备`
        : target.kind === 'monster'
          ? `${act} ${target.camp.name} · 讨伐`
          : `${act} ${target.npc.npcData.name}`
    this.closeLabel.setText(label).setPosition(pos.x, pos.y - 22).setVisible(true)
  }

  updatePlace() {
    const city = cityAt(this.player.x, this.player.y)
    const place = city
      ? (city.owner === 'player'
          ? `${city.name}（你的城池）`
          : `${city.name}（${city.lord}·${difficultyOf(city).name}）`)
      : '荒野官道'

    if (place !== this.lastPlace) {
      this.lastPlace = place
      if (city && city !== this.currentCity) {
        this.currentCity = city
        const mine = city.owner === 'player'
        const diff = difficultyOf(city)
        this.hud.showBanner(
          city.name,
          mine
            ? '你的领地'
            : `【${diff.name}】城主 ${city.lord} · 城防 ${Math.round(defenderPower(city))}`,
          mine ? city.color : diff.color
        )
      }
    }
  }
}

function sideCn(side) {
  return { n: '北门', s: '南门', w: '西门', e: '东门' }[side]
}
