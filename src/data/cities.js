// 九座主城配置。玩家拥有 c1（中央），其余八座由 NPC 城主坐镇。
// 城池填满 3x3 网格，按行、列顺序排列：玩家城居中，八座敌城环绕，
// 其中正北（c8 芦花城）与正南（c9 桑落城）一出城门就与青禾城接壤。
//
// 每座城都是独立经济体：有自己的金币、兵力，以及军营
// （步兵营 infantry / 骑兵营 cavalry / 军械库 armory / 神机营 corps / 城墙 wall）的科技等级。
// 玩家可经营自己的城；NPC 城也会随时间自行发展，并伺机出兵来犯。
//
// 这里存的是**基线数据**（CITY_SEED），关卡开局时由 resetCities() 拷进
// 可变的 CITIES 数组。这样"重开关卡"只要再拷一次，世界里的引用全部有效。
// 每座城还带一个 difficulty（见 difficulty.js）：容易/中等/困难/地狱，
// 决定它的开局规模、发育速度与主动来犯的积极性。

const CITY_SEED = [
  {
    id: 'c4',
    name: '苍梧城',
    col: 0,
    row: 0,
    owner: 'npc',
    difficulty: 'medium',
    lord: '柳如烟',
    title: '城主',
    color: 0x88dd88,
    troops: { infantry: 103, cavalry: 16 },
    gold: 35,
    infra: { infantry: 3, cavalry: 2, armory: 2, corps: 1, wall: 2 },
    intro: '城外古木参天，城里药香满街。',
    flavor: {
      trade: '药材',
      goods: ['灵芝', '枸杞', '当归'],
      slogan: '苍梧深处，仙草生'
    }
  },
  {
    id: 'c8',
    name: '芦花城',
    col: 1,
    row: 0,
    owner: 'npc',
    difficulty: 'medium',
    lord: '田横',
    title: '城主',
    color: 0x8fd6c8,
    troops: { infantry: 30, cavalry: 2 },
    gold: 22,
    infra: { infantry: 2, cavalry: 1, armory: 1, corps: 1, wall: 1 },
    intro: '北门外一望芦苇，秋风起时满城飞絮。',
    flavor: {
      trade: '渔猎',
      goods: ['芦雁', '鱼干', '苇席'],
      slogan: '芦花深处，雁落平沙'
    }
  },
  {
    id: 'c6',
    name: '金沙城',
    col: 2,
    row: 0,
    owner: 'npc',
    difficulty: 'hard',
    lord: '公孙度',
    title: '城主',
    color: 0xffdd55,
    troops: { infantry: 163, cavalry: 26 },
    gold: 45,
    infra: { infantry: 4, cavalry: 4, armory: 3, corps: 2, wall: 3 },
    intro: '沙金铺地，铸坊昼夜不熄。',
    flavor: {
      trade: '金器',
      goods: ['金锭', '铜钱', '珠翠'],
      slogan: '金沙在握，富甲一方'
    }
  },
  {
    id: 'c2',
    name: '白鹭城',
    col: 0,
    row: 1,
    owner: 'npc',
    difficulty: 'easy',
    lord: '韩山',
    title: '城主',
    color: 0x66ccff,
    troops: { infantry: 33, cavalry: 3 },
    gold: 25,
    infra: { infantry: 1, cavalry: 1, armory: 1, corps: 1, wall: 1 },
    intro: '渡口粮仓，兵强马壮，只等有人来叩门。',
    flavor: {
      trade: '粮道',
      goods: ['新麦', '粟米', '豆粕'],
      slogan: '白鹭渡口，粮船不断'
    }
  },
  {
    id: 'c1',
    name: '青禾城',
    col: 1,
    row: 1,
    owner: 'player',
    difficulty: 'easy',
    lord: '你',
    title: '城主',
    color: 0xffcc33,
    troops: { infantry: 28, cavalry: 4 },
    gold: 20,
    infra: { infantry: 1, cavalry: 1, armory: 1, corps: 1, wall: 1 },
    intro: '你亲手立起的第一座城。集市喧闹，井水甘甜。',
    flavor: {
      trade: '布帛',
      goods: ['云锦', '棉布', '麻葛'],
      slogan: '青禾集市，天下货路通'
    }
  },
  {
    id: 'c3',
    name: '赤枫城',
    col: 2,
    row: 1,
    owner: 'npc',
    difficulty: 'medium',
    lord: '独孤烈',
    title: '城主',
    color: 0xff7755,
    troops: { infantry: 75, cavalry: 11 },
    gold: 20,
    infra: { infantry: 3, cavalry: 2, armory: 1, corps: 1, wall: 2 },
    intro: '城头插满赤枫旗，护城河水被映得通红。',
    flavor: {
      trade: '铁器',
      goods: ['生铁', '炭火', '钢锭'],
      slogan: '赤枫炉火，百里不熄'
    }
  },
  {
    id: 'c5',
    name: '碧波城',
    col: 0,
    row: 2,
    owner: 'npc',
    difficulty: 'hard',
    lord: '钱多多',
    title: '城主',
    color: 0x55ddee,
    troops: { infantry: 130, cavalry: 20 },
    gold: 40,
    infra: { infantry: 4, cavalry: 3, armory: 2, corps: 2, wall: 3 },
    intro: '水渠绕城三匝，鱼米与商船共行。',
    flavor: {
      trade: '水产',
      goods: ['鲈鱼', '河蚌', '海盐'],
      slogan: '碧波一渠，通商四海'
    }
  },
  {
    id: 'c9',
    name: '桑落城',
    col: 1,
    row: 2,
    owner: 'npc',
    difficulty: 'easy',
    lord: '裴无咎',
    title: '城主',
    color: 0xe6a3c8,
    troops: { infantry: 36, cavalry: 4 },
    gold: 26,
    infra: { infantry: 2, cavalry: 2, armory: 1, corps: 1, wall: 2 },
    intro: '城里机杼声通宵不绝，桑落酒远近闻名。',
    flavor: {
      trade: '桑蚕',
      goods: ['生丝', '绸缎', '桑葚'],
      slogan: '桑落酒熟，机杼不休'
    }
  },
  {
    id: 'c7',
    name: '玄霜城',
    col: 2,
    row: 2,
    owner: 'npc',
    difficulty: 'hell',
    lord: '皇甫冰',
    title: '城主',
    color: 0xbb99ff,
    troops: { infantry: 172, cavalry: 29 },
    gold: 50,
    infra: { infantry: 5, cavalry: 4, armory: 3, corps: 2, wall: 3 },
    intro: '终年寒霜，城墙覆雪，最难攻也最不肯降。',
    flavor: {
      trade: '皮毛',
      goods: ['貂裘', '狐皮', '熊胆'],
      slogan: '玄霜苦寒，寸土不让'
    }
  }
]


// 活数据：所有模块都引用这一份（含 CITY_BY_ID），
// 关卡重开时原地改写对象字段，引用不会失效。
// INFRA_KEYS 必须与 military.js 的 BRANCHES 对齐（谁加分支谁来这里补一项）。
export const INFRA_KEYS = ['infantry', 'cavalry', 'armory', 'corps', 'wall']

export const CITIES = CITY_SEED.map(city => ({
  ...city,
  troops: { ...city.troops },
  infra: { ...city.infra },
  _npc: null
}))


export const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]))

const SEED_BY_ID = Object.fromEntries(CITY_SEED.map(c => [c.id, c]))

// 把九座城恢复到基线状态，并按 plan（{ cityId: difficultyKey }）重铺难度。
// 关卡切换、重开都走这一个入口，保证不会有上一局残留的兵力/归属/NPC 状态。
export function resetCities(plan = null) {
  for (const city of CITIES) {
    const base = SEED_BY_ID[city.id]
    city.troops = { ...base.troops }
    city.gold = base.gold
    city.infra = { ...base.infra }
    // 新增军营分支时，老存档/老数据里可能没有这一项——补成 1 级，
    // 否则 levelOf() 会拿到 undefined，整个战力公式会变成 NaN。
    for (const key of INFRA_KEYS) {
      if (!(key in city.infra)) city.infra[key] = 1
    }
    city.owner = base.owner
    city.lord = base.lord
    city.difficulty = plan?.[city.id] || base.difficulty
    city._npc = null
  }
  return CITIES
}

// 玩家的根基之地：唯一不会被 NPC 夺走的城池（只会被劫掠），
// 免得玩家一觉醒来全无立锥之地，直接无事可做。
export const CAPITAL_ID = 'c1'

export function ownedCities() {
  return CITIES.filter(c => c.owner === 'player')
}

export function troopCount(city) {
  return city.troops.infantry + city.troops.cavalry
}

export function totalTroops() {
  return ownedCities().reduce((n, c) => n + troopCount(c), 0)
}

export function totalGold() {
  return ownedCities().reduce((n, c) => n + c.gold, 0)
}

// 网格正交邻居：九城填满 3x3，因此每座城都有 2~4 个接壤的邻居。
export function isAdjacent(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1
}

export function neighborsOf(cityId) {
  const self = CITY_BY_ID[cityId]
  if (!self) return []
  return CITIES.filter(c => c.id !== cityId && isAdjacent(self, c))
}

// 只能攻打与自己领地正交相邻的城池。
export function canAttack(cityId, ownedIds) {
  const target = CITY_BY_ID[cityId]
  if (!target || target.owner === 'player') return false
  if (ownedIds.includes(cityId)) return false
  return neighborsOf(cityId).some(n => ownedIds.includes(n.id))
}
