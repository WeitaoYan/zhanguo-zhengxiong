// 关卡：从"八家容易"一路打到"八家地狱"，覆盖四档难度以及它们相邻的混合。
//
// 每关只改一件事——把八座 NPC 城按一份难度清单重新上难度，
// 再按难度重铺开局兵力/军营等级与野外怪物的强度。地图、城池、经济规则全都不变，
// 于是"换关"就等于换一整套压力曲线，而不是换一个游戏。
//
// 清单顺序固定为「四邻（北/西/东/南）→ 四角」：越靠后的城离青禾城越远，
// 所以混合难度的关卡里，压力是从家门口开始、一圈一圈往外涨的。

import { CITIES, CITY_BY_ID, resetCities, CAPITAL_ID } from './cities.js'
import { DIFFICULTIES, DIFFICULTY_ORDER, difficultyOf } from './difficulty.js'
import { MAX_LEVEL } from './military.js'

// 八座敌城的难度铺设顺序（近邻先、四角后）
export const STAGE_CITY_ORDER = ['c8', 'c2', 'c3', 'c9', 'c4', 'c6', 'c5', 'c7']

const E = 'easy'
const M = 'medium'
const H = 'hard'
const X = 'hell'

// plan 的长度固定为 8，与 STAGE_CITY_ORDER 一一对应。
// monsterBoost 放大野外小怪的强度（地狱关的狼也比入门关的狼凶）。
// playerBoost 只放大玩家的根基之地：高难度关的敌城成倍增长，
// 玩家若还按 1.0 开局，出门就是死局。
export const STAGES = [
  {
    index: 0, name: '承平之世', tag: '入门', rank: 1,
    desc: '八家皆是容易。城主们只求自保，你可以慢慢经营、从容出兵。',
    plan: [E, E, E, E, E, E, E, E],
    monsterBoost: 0.8, playerBoost: 1
  },
  {
    index: 1, name: '边烽初起', tag: '轻松', rank: 2,
    desc: '六家容易、两家中等。四角的两座城开始囤兵，但还追不上你。',
    plan: [E, E, E, E, E, E, M, M],
    monsterBoost: 0.9, playerBoost: 1.05
  },
  {
    index: 2, name: '群雄割据', tag: '普通', rank: 3,
    desc: '容易与中等各半。你可以在家门口先打几场顺风仗，再往四角推进。',
    plan: [E, E, E, E, M, M, M, M],
    monsterBoost: 1, playerBoost: 1.15
  },
  {
    index: 3, name: '狼烟四起', tag: '标准', rank: 4,
    desc: '八家皆中等。攒够兵就会来叩门，补兵与修墙缺一不可。',
    plan: [M, M, M, M, M, M, M, M],
    monsterBoost: 1.1, playerBoost: 1.25
  },
  {
    index: 4, name: '铁骑压境', tag: '偏难', rank: 5,
    desc: '中等与困难各半。四角已是要塞，稍有优势的敌军就会主动找上门。',
    plan: [M, M, M, M, H, H, H, H],
    monsterBoost: 1.2, playerBoost: 1.35
  },
  {
    index: 5, name: '铁血山河', tag: '困难', rank: 6,
    desc: '八家皆困难。两路敌军可以同时在外，准备时间也被压缩。',
    plan: [H, H, H, H, H, H, H, H],
    monsterBoost: 1.3, playerBoost: 1.5
  },
  {
    index: 6, name: '血染九州', tag: '极难', rank: 7,
    desc: '困难与地狱各半。四角是真正的绞肉机，家门口反而先给你留了口气。',
    plan: [H, H, H, H, X, X, X, X],
    monsterBoost: 1.4, playerBoost: 1.65
  },
  {
    index: 7, name: '天下大乱', tag: '地狱', rank: 8,
    desc: '八家皆地狱。只要觉得咬得动就会扑上来，三路并进，几乎没有喘息。',
    plan: [X, X, X, X, X, X, X, X],
    monsterBoost: 1.5, playerBoost: 1.8
  }
]

let active = 0

export function stageIndex() {
  return active
}

export function currentStage() {
  return STAGES[active]
}

export function planFor(stage) {
  const out = {}
  STAGE_CITY_ORDER.forEach((id, i) => { out[id] = stage.plan[i] })
  const capital = CITY_BY_ID[CAPITAL_ID]
  if (capital) out[CAPITAL_ID] = capital.difficulty
  return out
}

// 关卡难度配比摘要，给 UI 用：「易×4　中×4」
export function stageSummary(stage) {
  const count = {}
  for (const key of stage.plan) count[key] = (count[key] || 0) + 1
  return DIFFICULTY_ORDER
    .filter(k => count[k])
    .map(k => `${DIFFICULTIES[k].short}×${count[k]}`)
    .join('　')
}

export function stageLabel(stage) {
  return `第 ${stage.rank} 关　${stage.name}（${stage.tag}）`
}

// 应用关卡：重铺归属/兵力/军营/难度。
// 只改数据，不碰世界表现——场景负责在调用之后把门、军营、怪物刷新一遍。
export function applyStage(index) {
  const i = Math.max(0, Math.min(STAGES.length - 1, index | 0))
  active = i
  const stage = STAGES[i]
  resetCities(planFor(stage))

  for (const city of CITIES) {
    const diff = difficultyOf(city)
    if (city.owner === 'player') {
      // 玩家城：只吃关卡的 playerBoost，难度不参与（难度描述的是对手）
      const k = stage.playerBoost
      city.troops.infantry = Math.max(4, Math.round(city.troops.infantry * k))
      city.troops.cavalry = Math.max(0, Math.round(city.troops.cavalry * k))
      city.gold = Math.max(0, Math.round(city.gold * k))
      continue
    }
    // NPC 城：难度决定开局规模
    city.troops.infantry = Math.max(4, Math.round(city.troops.infantry * diff.startTroops))
    city.troops.cavalry = Math.max(0, Math.round(city.troops.cavalry * diff.startTroops))
    for (const key of Object.keys(city.infra)) {
      city.infra[key] = Math.max(1, Math.min(MAX_LEVEL, city.infra[key] + diff.startInfra))
    }
  }
  return stage
}

// 地狱关的野外小怪也更强，供 MonsterField 使用
export function monsterBoost() {
  return currentStage().monsterBoost
}
