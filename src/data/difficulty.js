// 城池难度分级：容易 / 中等 / 困难 / 地狱。
//
// 难度是一把"总旋钮"，同时拧动三件事：
//   1. 开局规模与发育速度 —— startTroops / startInfra / growth。
//      越难的城一开始兵更多、军营更高，NPC 攒兵与升科技也更快。
//   2. 主动来犯的积极性 —— assault.*。
//      这是玩家最直接的体感：检查间隔越短、出兵门槛越低、留守越少、
//      宣战到接战的倒计时越短、允许同时出兵的路数越多，就越凶。
//      容易档的城主基本守着自家城门；地狱档会趁你城防空虚立刻扑上来。
//   3. 城防系数 —— defense。守城战力整体上浮，攻城要付更多本钱。
//
// 玩家自己的城池不吃 defense 加成（难度描述的是"对手有多难"）。

export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'hell']

export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    name: '容易',
    short: '易',
    rank: 1,
    color: 0x7fd48a,
    hex: '#7fd48a',
    desc: '新手上路。城主守着自家城门，出兵少、来得慢，倒计时也留得宽裕。',
    startTroops: 0.6,
    startInfra: -1,
    growth: 0.6,
    defense: 0.9,
    assault: {
      grace: 300,      // 开局宽限（tick）：约 10 分钟不会来犯
      check: 260,      // 两次出兵意向之间的间隔（tick）
      edge: 1.9,       // 宣战门槛：攻方战力要到城防的多少倍
      leave: 0.65,     // 留守比例：一次最多带走 35% 守军
      cooldown: 260,   // 同一座城两次出兵的间隔
      warn: 22,        // 宣战到接战的准备时间（tick）
      concurrent: 1    // 允许同时在外的一路敌军数
    }
  },
  medium: {
    key: 'medium',
    name: '中等',
    short: '中',
    rank: 2,
    color: 0xffcc33,
    hex: '#ffcc33',
    desc: '势均力敌。攒够兵就会来叩门，但还留着补兵修墙的余地。',
    startTroops: 1,
    startInfra: 0,
    growth: 1,
    defense: 1,
    assault: {
      grace: 150,
      check: 150,
      edge: 1.35,
      leave: 0.5,
      cooldown: 120,
      warn: 15,
      concurrent: 1
    }
  },
  hard: {
    key: 'hard',
    name: '困难',
    short: '难',
    rank: 3,
    color: 0xff9a5a,
    hex: '#ff9a5a',
    desc: '精兵强将。稍有优势就出兵，两路齐来，准备时间也被压缩。',
    startTroops: 1.4,
    startInfra: 1,
    growth: 1.35,
    defense: 1.08,
    assault: {
      grace: 100,
      check: 90,
      edge: 1.1,
      leave: 0.35,
      cooldown: 80,
      warn: 12,
      concurrent: 2
    }
  },
  hell: {
    key: 'hell',
    name: '地狱',
    short: '狱',
    rank: 4,
    color: 0xff5555,
    hex: '#ff5555',
    desc: '饿狼环伺。只要觉得能咬下一块就出兵，三路并进，几乎不给你喘息。',
    startTroops: 1.9,
    startInfra: 1,
    growth: 1.8,
    defense: 1.15,
    assault: {
      grace: 90,
      check: 60,
      edge: 0.95,
      leave: 0.25,
      cooldown: 50,
      warn: 10,
      concurrent: 3
    }
  }
}

export function difficultyOf(city) {
  return DIFFICULTIES[city?.difficulty] || DIFFICULTIES.medium
}

// 给 UI 用：显示成【困难】这样的短标签
export function difficultyTag(city) {
  if (!city || city.owner === 'player') return '—'
  return `【${difficultyOf(city).name}】`
}
