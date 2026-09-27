// 野外小怪：地图空档里盘踞的狼群、山贼、野猪、黑熊与流寇。
//
// 它们不参与城池经济，也不主动来犯——是给玩家"用兵换兵"的野味：
// 押上一部分守军去打，赢了就把俘虏/缴获的兵员收编进参战的城池。
// 所以小怪既是低风险的练手对象，也是开局最快的一条扩军路子：
// 不必等税收攒够，出门打两窝狼就能补一批兵。
//
// 三条设计红线
//  1. 打小怪同样按"投入兵力 → 战力比 → 胜算"结算，和攻城共用一套算法，
//     玩家不用学第二套规则；伤亡也照吃，白嫖是不存在的。
//  2. 收编的兵员受养兵上限约束，超编部分折价充公（见 grantTroops），
//     否则打几窝怪就能绕过军饷这道门槛，把经济曲线整条绕过去。
//  3. 荡平只是暂时的：过一段时间会重新聚起，而且比上一窝更强。

import { allocationPower, applyCasualties, grantTroops, winChance, troopCount } from './military.js'
import { CITY_BY_ID } from './cities.js'

// 讨伐战的战力口径与攻城一致：比值 <= 1 必败，2 倍稳赢（见 military.winChance）
const RAID_WIN_RATE = 0.12
const RAID_LOSS_RATE = 0.3

export const MAX_CAMP_LEVEL = 5
export const CAMP_RESPAWN_TICKS = 75     // 约 2.5 分钟后重新聚起
export const CAMP_LEVEL_STEP = 0.55      // 每级强度增幅
export const CAMP_REWARD_STEP = 0.45     // 每级赏金/兵员增幅

// basePower 是 1 级时的寨防战力。开局玩家全城约 34 战力，
// 所以门口的狼窝（16）是稳赢，山贼寨（30）已经要掂量一下。
export const MONSTER_KINDS = {
  wolf: {
    key: 'wolf', name: '野狼群', tier: 1,
    basePower: 16, reward: { infantry: 5, cavalry: 0 }, gold: 2,
    desc: '饿极了的狼群，见人就扑，但到底只是畜生。'
  },
  bandit: {
    key: 'bandit', name: '山贼寨', tier: 2,
    basePower: 30, reward: { infantry: 9, cavalry: 2 }, gold: 8,
    desc: '劫道的散兵游勇，寨里还关着不少被掳的壮丁。'
  },
  boar: {
    key: 'boar', name: '野猪林', tier: 2,
    basePower: 46, reward: { infantry: 12, cavalry: 2 }, gold: 10,
    desc: '成群的山猪把林子拱成了泥塘，猎户都不敢靠近。'
  },
  bear: {
    key: 'bear', name: '黑熊窝', tier: 3,
    basePower: 66, reward: { infantry: 15, cavalry: 4 }, gold: 14,
    desc: '一头占山为王的黑熊，皮糙肉厚，寻常刀枪难入。'
  },
  rebel: {
    key: 'rebel', name: '流寇营', tier: 4,
    basePower: 96, reward: { infantry: 24, cavalry: 6 }, gold: 24,
    desc: '溃兵结成的营寨，营中有甲有马，是块硬骨头也是块肥肉。'
  }
}

export const MONSTER_KIND_LIST = Object.values(MONSTER_KINDS)

// 按等级与关卡强度算出的实际寨防
export function monsterPower(camp) {
  const kind = MONSTER_KINDS[camp.kind] || MONSTER_KINDS.wolf
  const lv = Math.max(1, camp.level | 0)
  const boost = camp.boost || 1
  return Math.max(1, Math.round(kind.basePower * (1 + CAMP_LEVEL_STEP * (lv - 1)) * boost))
}

// 讨伐成功后可收编的兵员与缴获
export function monsterReward(camp) {
  const kind = MONSTER_KINDS[camp.kind] || MONSTER_KINDS.wolf
  const lv = Math.max(1, camp.level | 0)
  const boost = camp.boost || 1
  const k = (1 + CAMP_REWARD_STEP * (lv - 1)) * boost
  return {
    infantry: Math.max(1, Math.round(kind.reward.infantry * k)),
    cavalry: Math.round(kind.reward.cavalry * k),
    gold: Math.max(0, Math.round(kind.gold * k))
  }
}

export function monsterName(camp) {
  const kind = MONSTER_KINDS[camp.kind] || MONSTER_KINDS.wolf
  return `${kind.name} Lv${camp.level}`
}

export function monsterKind(camp) {
  return MONSTER_KINDS[camp.kind] || MONSTER_KINDS.wolf
}

// allocation: { cityId: 投入兵力 } —— 与攻城面板同一份数据结构
export function previewRaid(camp, allocation) {
  const { attack, committed } = allocationPower(allocation)
  const defend = camp.power || monsterPower(camp)
  const ratio = defend > 0 ? attack / defend : 0
  const chance = winChance(ratio)
  return {
    committed,
    attack,
    defend,
    ratio,
    chance,
    win: committed > 0 && chance >= 0.5,
    raid: true
  }
}

// roll 可注入，便于平衡模拟与测试复现
export function resolveRaid(camp, allocation, roll = Math.random()) {
  const pre = previewRaid(camp, allocation)
  const victory = pre.committed > 0 && roll < pre.chance
  const lost = Math.round(pre.committed * (victory ? RAID_WIN_RATE : RAID_LOSS_RATE))

  // 先记下各城的出力占比，再扣伤亡 —— 否则占比会被伤亡改写
  const shares = []
  for (const [cityId, n] of Object.entries(allocation || {})) {
    const city = CITY_BY_ID[cityId]
    if (!city || city.owner !== 'player') continue
    const take = Math.min(n, troopCount(city))
    if (take <= 0) continue
    shares.push({ city, share: take / pre.committed })
  }

  applyCasualties(allocation, lost, pre.committed)

  let reward = null
  if (victory) {
    const raw = monsterReward(camp)
    reward = { infantry: 0, cavalry: 0, gold: 0, overflowGold: 0, byCity: [] }
    for (const { city, share } of shares) {
      const got = grantTroops(city, {
        infantry: raw.infantry * share,
        cavalry: raw.cavalry * share
      })
      const gold = Math.round(raw.gold * share)
      city.gold += gold
      reward.infantry += got.infantry
      reward.cavalry += got.cavalry
      reward.gold += gold
      reward.overflowGold += got.gold
      reward.byCity.push({ city, infantry: got.infantry, cavalry: got.cavalry, gold, overflowGold: got.gold })
    }
  }

  return { ...pre, win: victory, lost, roll, reward }
}
