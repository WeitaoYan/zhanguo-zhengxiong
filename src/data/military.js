// 军事系统：军营科技、金币经济、兵员训练、战力结算与攻城胜负。
//
// 设计要点
//  1. 每座城独立发展：金币、兵力、四处军营等级都是 per-city 的，互不相通。
//  2. 军营分工明确——步兵营练步兵、骑兵营练骑兵、军械库是科技与后勤总枢纽，
//     城墙纯防御，神机营是编制与操典（攻守两端同时提升，纯战力投资）。
//  3. 玩家城池只有税收会自动累积，兵力必须自己花钱练；所以"升级还是扩编"是真取舍。
//  4. 战力 = （步兵 + 骑兵×骑兵系数）× 军械库科技系数 × 神机营。攻城时把玩家各城
//     投入的兵力汇总成进攻方战力，与守城方战力比大小，胜者得城、败者折损兵力。
//  5. NPC 城池同样随时间积累金币、自动练兵与升级军营，放着不管只会越来越难打。
//     发育与升级速度由城池难度（容易/中等/困难/地狱）整体缩放，见 difficulty.js。
//  6. NPC 不是纯粹的沙包：战力够了就会主动向相邻的玩家城池宣战，
//     宣战到接战之间留了一段准备时间，玩家补兵/修墙就能把敌军逼退。
//     出兵的门槛、频率与同时出兵的路数同样由城池难度决定。

import { CITIES, CITY_BY_ID, canAttack, neighborsOf, CAPITAL_ID } from './cities.js'
import { difficultyOf } from './difficulty.js'

export const MAX_LEVEL = 5
export const TICK_MS = 2000

// 骑兵单兵战力，相当于多少名步兵
export const CAVALRY_POWER = 1.6

export const BRANCHES = [
  {
    key: 'infantry',
    name: '步兵营',
    short: '步',
    desc: '屯集步卒，兵员的主要来源。',
    color: '#7fd4ff',
    upgradeBase: 70,
    trainKey: 'infantry'
  },
  {
    key: 'cavalry',
    name: '骑兵营',
    short: '骑',
    desc: '养马编骑，单兵战力远超步卒，更省饷银，但造价高昂且攻城不吃城墙加成。',
    color: '#ffd27f',
    upgradeBase: 105,
    trainKey: 'cavalry'
  },
  {
    key: 'armory',
    name: '军械库',
    short: '械',
    desc: '屯粮铸甲，提供科技加成与税收，并减免一切开销。',
    color: '#ff9f7f',
    upgradeBase: 160,
    trainKey: null
  },
  {
    key: 'corps',
    name: '神机营',
    short: '神',
    desc: '专精编制与操典：同样的兵员练成更强的战力，攻击与防御一并提升。不产税，也不减免开销。',
    color: '#ffd48a',
    upgradeBase: 120,
    trainKey: null
  },
  {
    key: 'wall',
    name: '城墙',
    short: '城',
    desc: '加高夯墙，显著提升守城战力。守军越集中受益越大，骑兵几乎不吃加成。',
    color: '#c9b79a',
    upgradeBase: 120,
    trainKey: null
  }
]

export const BRANCH_BY_KEY = Object.fromEntries(BRANCHES.map(b => [b.key, b]))

// 一次训练产出的兵员数量
export const BATCH = { infantry: 10, cavalry: 5 }

// 每周期每名士兵的军饷（金币）。这就是兵力的天然上限：
// 饷银发不出来，士兵就会逃亡，所以"养多少兵"受限于城池财力。
export const UPKEEP = { infantry: 0.05, cavalry: 0.07 }

// 缺饷时每周期逃亡的比例
const DESERT_RATE = 0.06

// 骑兵破城：守城时骑兵享受的城墙加成大幅折扣
const CAV_WALL_FACTOR = 0.25

export function levelOf(city, key) {
  return city.infra[key]
}

export function troopCount(city) {
  return city.troops.infantry + city.troops.cavalry
}

// 每周期税收。Lv1 城池约可养 100 兵，满级约 440 兵。
// 税收必须明显高于满编时的军饷，城池才有余钱用于升级，
// 否则一旦满编就永远攒不出升级费用，卡成死局。
export function goldPerTick(city) {
  const i = city.infra
  return Math.round(5 + (i.armory - 1) * 2.2 + (i.infantry - 1 + i.cavalry - 1) * 1.1)
}

// 每周期军饷开支
export function upkeepPerTick(city) {
  return city.troops.infantry * UPKEEP.infantry + city.troops.cavalry * UPKEEP.cavalry
}

// 当前财力能养住的兵力上限（按全步兵口径估算，用于 UI 展示）
// 带兵上限 = 收支平衡点的这个比例。取 1.0 的话，满编时军饷刚好吃光税收，
// 城里再也攒不出升级的钱，军队规模就此锁死，NPC 却还在一直涨——死锁。
// 留出 40% 结余，满编之后依然养得起下一座军营。
export const SUSTAIN = 0.6
export function troopCapacity(city) {
  const income = goldPerTick(city)
  if (income <= 0) return 0
  return Math.floor((income / UPKEEP.infantry) * SUSTAIN)
}

// 升级费用：随等级递增，军械库等级提供折扣
export function upgradeCost(city, key) {
  const lv = levelOf(city, key)
  if (lv >= MAX_LEVEL) return null
  // 成本随等级线性放缓，而不是 base*lv 的陡增：
  // 陡增会让第 4、5 级贵到没人买得起，玩家早早卡在低军营，
  // 而 NPC 的野心上限却会把五级都解锁——两边永远追不上。
  const raw = Math.round(BRANCH_BY_KEY[key].upgradeBase * (1 + 0.5 * (lv - 1)))
  return discountCost(city, raw)
}

function discountCost(city, raw) {
  const d = 1 - 0.07 * (city.infra.armory - 1)
  return Math.max(8, Math.round(raw * d))
}

// 训练费用（金币）。步兵单价低、铺量快；骑兵单价高但更省饷银，
// 且攻城时不吃城墙加成。
//
// 关键：扩编费用随"军营占用率"上升。兵越多，再练一批越贵，
// 于是"继续堆兵"会越来越不划算，玩家必须去升级军营扩大产能，
// 否则就会被军饷和费用双重卡死。
const TRAIN_LOAD_SCALE = 1.6

export function trainCost(city, key) {
  const base = key === 'infantry' ? 8 : 14
  const cap = troopCapacity(city)
  const load = cap > 0 ? Math.min(1, troopCount(city) / cap) : 1
  const scale = 1 + TRAIN_LOAD_SCALE * load
  return discountCost(city, Math.max(1, Math.round(base * scale)))
}

// 军营占用率（0~1），UI 用来提示"扩编变贵了，考虑升级"
export function armyLoad(city) {
  const cap = troopCapacity(city)
  return cap > 0 ? Math.min(1, troopCount(city) / cap) : 1
}

// 军械库科技系数：全城战力加成（同时管税收与升级折扣）
export function techFactor(city) {
  return 1 + 0.14 * (city.infra.armory - 1)
}

// 神机营：编制与操典改良。与军械库的科技系数不同，它只吃战力，
// 不给税收也不给折扣，是纯粹"把兵练强"的投入——而且是攻守双吃。
export const CORPS_STEP = 0.12

export function corpsFactor(city) {
  return 1 + CORPS_STEP * (levelOf(city, 'corps') - 1)
}

// 所有战力加成的总系数（科技 × 神机营）
export function powerFactor(city) {
  return techFactor(city) * corpsFactor(city)
}

// 单城战力（野战）
export function cityPower(city) {
  const t = city.troops
  return (t.infantry + t.cavalry * CAVALRY_POWER) * powerFactor(city)
}

// 城墙加成：军械库等级提供基础防护，城墙等级是纯粹的防御投资。
// 骑兵几乎不吃城墙加成（见 CAV_WALL_FACTOR），所以守军想靠墙就得配步兵。
export const WALL_STEP = 0.11

export function wallBonus(city) {
  return 1.15 + 0.1 * (city.infra.armory - 1) + WALL_STEP * (levelOf(city, 'wall') - 1)
}

// 难度带来的城防加成只算在 NPC 头上：难度描述的是"这座城有多难打"，
// 玩家自己打下来的城不该因为原主是地狱难度就白拿一份防御。
function difficultyDefense(city) {
  return city.owner === 'player' ? 1 : difficultyOf(city).defense
}

export function defenderPower(city) {
  const t = city.troops
  const total = t.infantry + t.cavalry
  if (total <= 0) return 0
  const wallShare = (t.infantry + t.cavalry * CAV_WALL_FACTOR) / total
  const wall = 1 + (wallBonus(city) - 1) * wallShare
  return (t.infantry + t.cavalry * CAVALRY_POWER) * powerFactor(city) * wall * difficultyDefense(city)
}

export function canUpgrade(city, key) {
  if (city.owner !== 'player') return false
  if (city.infra[key] >= MAX_LEVEL) return false
  return spendableGold(city) >= upgradeCost(city, key)
}

export function canTrain(city, key) {
  if (city.owner !== 'player') return false
  if (!BRANCH_BY_KEY[key].trainKey) return false
  // 带兵量受军饷约束，超编的兵是养不起的：UI 和核心 API 都要守住这条线，
  // 否则玩家（或脚本）可以无限堆兵，把经济曲线彻底绕过去。
  if (troopCount(city) + BATCH[BRANCH_BY_KEY[key].trainKey] > troopCapacity(city)) return false
  return spendableGold(city) >= trainCost(city, key)
}

export function applyUpgrade(city, key) {
  if (!canUpgrade(city, key)) return false
  city.gold -= upgradeCost(city, key)
  city.infra[key] += 1
  return true
}

export function applyTrain(city, key) {
  if (!canTrain(city, key)) return false
  const tk = BRANCH_BY_KEY[key].trainKey
  city.gold -= trainCost(city, key)
  city.troops[tk] += BATCH[tk]
  return true
}

// ---- 攻城 ----

// 占领后残留的驻军规模：原守军的比例
export const OCCUPY_RATIO = 0.2
const OCCUPY_GARRISON = { min: 10 }

// 攻守并非只看战力数字：兵力占优不代表一定打得下来。
// 比值 <= 1 直接判负——以少打多不能靠运气蒙。
// 1.0 ~ 2.0 之间是风险区，越接近 2.0 越稳；达到 2.0 判定为稳操胜券。
// 关键设计：把「必胜线」放在 2 倍而不是无穷大，玩家心里有一把明确的尺子，
// 缺口够大就敢押上全部兵力，缺口不够就继续攒兵升级城墙。
export const BATTLE_RISK = 2.6
export const CERTAIN_EDGE = 2.0

export function winChance(ratio) {
  if (!(ratio > 1)) return 0
  if (ratio >= CERTAIN_EDGE) return 1
  // 把 (1, CERTAIN_EDGE) 归一化到 (0, 1)，让 logistic 恰好在 2.0 收敛到 1
  const t = (ratio - 1) / (CERTAIN_EDGE - 1)
  return 1 / (1 + Math.exp(-BATTLE_RISK * t))
}

// allocation: { cityId: 投入兵力 }，由玩家在开战面板上手动分配。
// 把"各城按投入比例出的战力"汇总成一个数——攻城与小怪讨伐共用同一套算法。
export function allocationPower(allocation) {
  let attack = 0
  let committed = 0
  for (const [cityId, n] of Object.entries(allocation || {})) {
    const city = CITY_BY_ID[cityId]
    if (!city || city.owner !== 'player' || n <= 0) continue
    const have = troopCount(city)
    if (have <= 0) continue
    const take = Math.min(n, have)
    attack += cityPower(city) * (take / have)
    committed += take
  }
  return { attack, committed }
}

// 按投入比例扣兵：先扣步兵，步兵不够再扣骑兵。
// 玩家攻城与小怪讨伐都走这一条，免得两边的伤亡口径不一致。
export function applyCasualties(allocation, lost, committed) {
  if (lost <= 0 || committed <= 0) return
  for (const [cityId, n] of Object.entries(allocation || {})) {
    const city = CITY_BY_ID[cityId]
    if (!city || city.owner !== 'player') continue
    const take = Math.min(n, troopCount(city))
    if (take <= 0) continue
    let need = Math.round(lost * take / committed)
    const fromInf = Math.min(city.troops.infantry, need)
    city.troops.infantry -= fromInf
    need -= fromInf
    if (need > 0) city.troops.cavalry = Math.max(0, city.troops.cavalry - need)
  }
}

// 收编战利品兵员。养兵上限之外的部分折价充公（金币），
// 免得"打赢了却因为超编第二天全逃光"这种白忙一场的体验。
export const OVERFLOW_GOLD = 2

export function grantTroops(city, add) {
  const out = { infantry: 0, cavalry: 0, gold: 0 }
  for (const key of ['infantry', 'cavalry']) {
    const want = Math.max(0, Math.round(add?.[key] || 0))
    if (!want) continue
    const room = Math.max(0, troopCapacity(city) - troopCount(city))
    const take = Math.min(want, room)
    city.troops[key] += take
    out[key] = take
    out.gold += (want - take) * OVERFLOW_GOLD
  }
  if (out.gold > 0) city.gold += out.gold
  return out
}

export function previewBattle(target, allocation) {
  const { attack, committed } = allocationPower(allocation)
  const defend = defenderPower(target)
  const ratio = defend > 0 ? attack / defend : 0
  const chance = winChance(ratio)
  return {
    committed,
    attack,
    defend,
    ratio,
    chance,
    // 「占优」只代表胜率过半，不保证一定赢
    win: committed > 0 && chance >= 0.5
  }
}

// roll 可注入，便于平衡模拟与测试复现；默认真随机
export function resolveBattle(target, allocation, roll = Math.random()) {
  const pre = previewBattle(target, allocation)
  const victory = pre.committed > 0 && roll < pre.chance
  // 伤亡比例：打输亏得更多，打赢也有折损
  const casualtyRate = victory ? 0.12 : 0.3
  const lost = Math.round(pre.committed * casualtyRate)

  for (const [cityId, n] of Object.entries(allocation)) {
    const city = CITY_BY_ID[cityId]
    if (!city || city.owner !== 'player' || pre.committed <= 0) continue
    const take = Math.min(n, troopCount(city))
    if (take <= 0) continue
    city.troops.infantry = Math.max(0, city.troops.infantry - Math.round(lost * take / pre.committed))
  }

  if (victory) {
    target.owner = 'player'
    target.lord = '你'
    // 守军溃散：城池易主，但 garrison 大部溃逃/被俘。
    // 玩家真正得到的是这座城的基业（军营等级与税收），而不是一支免费军队，
    // 所以每次占领都需要重新经营，节奏不会被滚雪球带飞。
    const t = target.troops
    t.infantry = Math.max(OCCUPY_GARRISON.min, Math.round(t.infantry * OCCUPY_RATIO))
    t.cavalry = Math.round(t.cavalry * OCCUPY_RATIO)
    if (target._npc) target._npc = null
  } else {
    // 守方也折损兵力，但远小于进攻方
    const t = target.troops
    t.infantry = Math.max(1, Math.round(t.infantry * 0.9))
    t.cavalry = Math.max(0, Math.round(t.cavalry * 0.9))
  }

  return { ...pre, win: victory, lost, roll }
}

// ---- NPC 主动出击 ----
//
// 玩家能打 NPC，NPC 当然也会打玩家。流程和玩家攻城同源，只是分两段：
//   宣战 → 倒计时（玩家可以增援）→ 接战结算
// 接战时的攻守数值是按"那一刻"的兵力重算的，所以玩家在倒计时里
// 往目标城练一批兵、升一级城墙，真的能把敌军逼退（比值掉回 1 以下即退兵）。
//
// 这一整套节奏由城池难度决定（见 difficulty.js 的 assault.*）：
//   容易：很久才考虑一次出兵，要 1.9 倍优势才敢出门，一趟只带三成守军，
//         倒计时 44 秒，同时只允许一路敌军在外。
//   地狱：每 2 分钟就盘算一次，0.95 倍就敢宣战，一趟带走七成五守军，
//         倒计时 20 秒，最多三路并进。
const ASSAULT_MIN_COMMIT = 6            // 凑不够这些人就不出门

// 这一趟打算带多少人出去：留够守家的，剩下的才能带走
function assaultCommit(city, diff = difficultyOf(city)) {
  const have = troopCount(city)
  if (have <= 0) return 0
  return Math.max(0, Math.min(have - 1, Math.floor(have * (1 - diff.assault.leave))))
}

// 出兵意向：只挑"打得动"的目标，打不动就继续在家攒兵
export function assaultPlan(city, target) {
  const diff = difficultyOf(city)
  const have = troopCount(city)
  const commit = assaultCommit(city, diff)
  if (have <= 0 || commit < ASSAULT_MIN_COMMIT) return null
  const attack = cityPower(city) * (commit / have)
  const defend = defenderPower(target)
  if (defend <= 0) return null
  const edge = attack / defend
  if (edge < diff.assault.edge) return null
  return { commit, attack, defend, edge, difficulty: diff }
}

export function declaredAssaults() {
  const out = []
  for (const city of CITIES) {
    const a = city._npc?.assault
    if (city.owner !== 'npc' || !a) continue
    const target = CITY_BY_ID[a.targetId]
    if (target) out.push({ attacker: city, target, ticks: a.ticks })
  }
  return out
}

// 宣战：记下目标与倒计时，胜负留到接战那一刻再算
function declareAssault(city, target) {
  const plan = assaultPlan(city, target)
  if (!plan) return null
  const diff = plan.difficulty
  const s = npcState(city)
  s.assault = { targetId: target.id, ticks: diff.assault.warn }
  s.cool = diff.assault.cooldown
  return {
    kind: 'warn',
    attacker: city,
    target,
    commit: plan.commit,
    attack: plan.attack,
    defend: plan.defend,
    edge: plan.edge,
    difficulty: diff,
    seconds: (diff.assault.warn * TICK_MS) / 1000
  }
}

// 接战结算。规则与玩家攻城对称：比值 <= 1 直接判负，2 倍以上稳操胜券。
function resolveAssault(attacker, target, roll = Math.random()) {
  const diff = difficultyOf(attacker)
  const have = troopCount(attacker)
  const commit = assaultCommit(attacker, diff)
  const attack = have > 0 ? cityPower(attacker) * (commit / have) : 0
  const defend = defenderPower(target)
  const ratio = defend > 0 ? attack / defend : Infinity

  // 玩家在这段时间里补了兵、修了墙 → 敌军讨不到便宜，收兵回家
  if (commit < ASSAULT_MIN_COMMIT || !(ratio > 1)) {
    return {
      kind: 'withdraw',
      attacker,
      target,
      commit,
      attack,
      defend,
      ratio: Number.isFinite(ratio) ? ratio : 0,
      standDown: false
    }
  }

  const chance = winChance(ratio)
  const win = roll < chance
  const lost = Math.round(commit * (win ? 0.14 : 0.32))

  // 攻方折损从出兵城扣，骑兵先顶上
  const cavLost = Math.min(attacker.troops.cavalry, Math.round(lost * 0.45))
  attacker.troops.cavalry -= cavLost
  attacker.troops.infantry = Math.max(0, attacker.troops.infantry - (lost - cavLost))

  const ev = {
    kind: 'assault', attacker, target, commit, attack, defend, ratio, chance, win,
    lost, loot: 0, seized: false
  }

  if (!win) {
    // 攻方退兵，守方也要见血
    const t = target.troops
    t.infantry = Math.max(1, t.infantry - Math.round(t.infantry * 0.1))
    t.cavalry = Math.max(0, t.cavalry - Math.round(t.cavalry * 0.1))
    return ev
  }

  // 根基之地不会被夺走：破城之后只遭劫掠，玩家不会被一夜清空。
  if (target.id === CAPITAL_ID) {
    ev.loot = Math.floor(target.gold * 0.6)
    target.gold -= ev.loot
    attacker.gold += ev.loot
    const t = target.troops
    t.infantry = Math.max(3, Math.round(t.infantry * 0.55))
    t.cavalry = Math.round(t.cavalry * 0.55)
    return ev
  }

  // 城池易主：和玩家占领一样，NPC 拿到的是一座空壳，驻军所剩无几
  ev.seized = true
  target.owner = 'npc'
  target.lord = attacker.lord
  target._npc = null
  const t = target.troops
  t.infantry = Math.max(OCCUPY_GARRISON.min, Math.round(t.infantry * OCCUPY_RATIO))
  t.cavalry = Math.round(t.cavalry * OCCUPY_RATIO)
  return ev
}

// 每 tick 调一次：推进已有的宣战倒计时，并让各城按自己的难度节奏找机会出兵。
// 返回本 tick 发生的事件，交给场景去播报与刷新地图。
export function npcAssaultTick(tick) {
  const events = []

  for (const city of CITIES) {
    if (city.owner !== 'npc') continue
    const s = npcState(city)
    if (s.cool > 0) s.cool -= 1
    if (s.check > 0) s.check -= 1
    if (s.grace > 0) s.grace -= 1
    if (!s.assault) continue

    const target = CITY_BY_ID[s.assault.targetId]
    // 目标已经易主（或不存在了）→ 这趟出兵作废
    if (!target || target.owner !== 'player') {
      s.assault = null
      events.push({
        kind: 'withdraw', attacker: city, target, commit: 0,
        attack: 0, defend: 0, ratio: 0, standDown: true
      })
      continue
    }

    s.assault.ticks -= 1
    if (s.assault.ticks > 0) continue
    s.assault = null
    events.push(resolveAssault(city, target))
  }

  // 宣战机会：每座城各自计着 check 倒计时；难打的城允许更多路同时在外
  let active = declaredAssaults().length
  for (const city of CITIES) {
    if (city.owner !== 'npc') continue
    const s = npcState(city)
    const diff = difficultyOf(city)
    if (s.assault || s.cool > 0 || s.check > 0 || s.grace > 0) continue
    if (active >= diff.assault.concurrent) continue
    s.check = diff.assault.check

    let best = null
    for (const target of neighborsOf(city.id)) {
      if (target.owner !== 'player') continue
      const plan = assaultPlan(city, target)
      if (!plan) continue
      if (!best || plan.edge > best.edge) best = { target, ...plan }
    }
    if (!best) continue
    const ev = declareAssault(city, best.target)
    if (ev) {
      events.push(ev)
      active += 1
    }
  }

  return events
}

// ---- 时间推进 ----

// NPC 城池的发展速度远低于玩家可控城池：它们只是缓慢地扩编，
// 并按各自"野心"逐步解锁更高的军营等级。放着不管会变强，但不会失控。
// 难度在这一层同样生效：growth 直接乘在扩编速率、野心抬升与升级意愿上。
const NPC_UPGRADE_TICKS = 40       // 约 80 秒考虑一次升级
const NPC_CAP_TICKS = 420          // 野心上限每 420 tick 抬升一级（约 14 分钟）
const NPC_RESERVE = 2.5            // NPC 要留出 2.5 倍费用才肯升级

// NPC 扩编速率。玩家把金币变成兵力是复利（军营等级同时抬升税收与带兵上限），
// NPC 只是线性加兵，所以这里的基准必须明显更低，否则玩家永远追不上一个挂机对手。
const NPC_INF_BASE = 0.05
const NPC_INF_PER_LV = 0.012
const NPC_CAV_PER_LV = 0.015

function npcState(city) {
  if (!city._npc) {
    const floor = Math.max(2, ...Object.values(city.infra).filter(v => v < MAX_LEVEL))
    // cool：出兵冷却；check：下一次物色出兵机会的倒计时；grace：开局宽限；
    // assault：已宣战但还没接战的那一趟。三者的初值都取自城池难度。
    const diff = difficultyOf(city)
    city._npc = {
      infAcc: 0, cavAcc: 0, up: 0, capTicks: 0, cap: floor,
      cool: 0, check: diff.assault.check, grace: diff.assault.grace, assault: null
    }
  }
  return city._npc
}

function growNpc(city) {
  const s = npcState(city)
  const diff = difficultyOf(city)
  city.gold += goldPerTick(city)
  payUpkeep(city)

  // 缓慢扩编，用小数累积避免速率过小被抹平。
  // 和玩家一样受军饷上限约束：养不起的兵不该凭空长出来。
  if (troopCount(city) < troopCapacity(city)) {
    s.infAcc += (NPC_INF_BASE + city.infra.infantry * NPC_INF_PER_LV) * diff.growth
    if (city.infra.cavalry >= 2) s.cavAcc += NPC_CAV_PER_LV * city.infra.cavalry * diff.growth
  }
  while (s.infAcc >= 1) { s.infAcc -= 1; city.troops.infantry += 1 }
  while (s.cavAcc >= 1) { s.cavAcc -= 1; city.troops.cavalry += 1 }

  if (++s.up < NPC_UPGRADE_TICKS) return
  s.up = 0

  // 野心上限随时间缓慢抬升，NPC 不会突然暴涨；难度越高抬得越快
  if (s.cap < MAX_LEVEL) {
    s.capTicks += NPC_UPGRADE_TICKS * diff.growth
    if (s.capTicks >= NPC_CAP_TICKS) {
      s.capTicks = 0
      s.cap += 1
    }
  }

  // 城墙排在最后：NPC 先补兵种和军械，城墙是有余钱才修的奢侈品。
  // 这样城墙不会把整体难度推得过高。
  const reserve = NPC_RESERVE / diff.growth
  for (const key of ['armory', 'cavalry', 'infantry', 'wall']) {
    if (city.infra[key] >= s.cap) continue
    const cost = upgradeCost(city, key)
    if (cost != null && city.gold - upkeepPerTick(city) >= cost * reserve) {
      city.gold -= cost
      city.infra[key] += 1
      break
    }
  }
}

// 发饷。发不出来士兵就逃亡——这是兵力的硬上限。
function payUpkeep(city) {
  const need = upkeepPerTick(city)
  if (need <= city.gold) {
    city.gold = Math.round((city.gold - need) * 100) / 100
    return true
  }
  const paid = city.gold
  city.gold = 0
  // 只发得出部分饷银，按缺口比例逃亡
  const shortage = need <= 0 ? 1 : 1 - paid / need
  const rate = Math.min(0.4, DESERT_RATE * (1 + shortage * 4))
  const t = city.troops
  t.infantry = Math.max(0, t.infantry - Math.ceil(t.infantry * rate))
  t.cavalry = Math.max(0, t.cavalry - Math.ceil(t.cavalry * rate))
  return false
}

// 玩家城池：税收自动累积，练兵与升级都要玩家自己拍板。
// 欠饷同样会逃亡，所以扩张与保留之间存在真实张力。
export function growPlayerCity(city) {
  city.gold += goldPerTick(city)
  return payUpkeep(city)
}

// 推进一步。玩家城只积累金币（练兵由玩家决定），
// NPC 城则按自己的节奏缓慢扩编与升级。
export function growAll(log) {
  for (const city of CITIES) {
    if (city.owner === 'npc') growNpc(city)
    else growPlayerCity(city)
  }
}

// 玩家还剩多少闲钱可以拿去练兵/升级（要留出下期饷银）
export function spendableGold(city) {
  return Math.max(0, Math.floor(city.gold - upkeepPerTick(city)))
}

export function attackable(city) {
  const owned = CITIES.filter(c => c.owner === 'player').map(c => c.id)
  return canAttack(city.id, owned)
}
