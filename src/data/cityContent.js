import { CITIES } from './cities.js'

// 城内固定布局（相对城内左上角的偏移）。九座城共用同一套骨架，
// 因此每座城看起来是"相似的主城"，靠配色 / 摊贩 / 人物区分。
export const STALL_SPOTS = [
  { x: 300, y: 160 }, { x: 500, y: 160 }, { x: 700, y: 160 }, { x: 900, y: 160 },
  { x: 300, y: 500 }, { x: 500, y: 500 }, { x: 700, y: 500 }, { x: 900, y: 500 }
]

export const SHOP_NPC_SPOTS = [
  { x: 300, y: 220 }, { x: 500, y: 220 }, { x: 700, y: 220 }, { x: 900, y: 220 },
  { x: 300, y: 560 }, { x: 500, y: 560 }, { x: 700, y: 560 }, { x: 900, y: 560 }
]

export const VILLAGER_SPOTS = [
  { x: 180, y: 700, key: 'child' },
  { x: 1180, y: 720, key: 'old_man' },
  { x: 640, y: 980, key: 'farmer' }
]

export const PROPS = [
  { key: 'crate', x: 220, y: 250 }, { key: 'crate', x: 240, y: 262 },
  { key: 'obj_barrel', x: 380, y: 250 },
  { key: 'obj_barrel', x: 1030, y: 300 },
  { key: 'crate', x: 600, y: 600 }, { key: 'obj_barrel', x: 624, y: 612 },
  { key: 'well', x: 480, y: 360 },
  { key: 'sign', x: 480, y: 84 },
  { key: 'tree_green', x: 120, y: 120 }, { key: 'tree_green2', x: 110, y: 210 },
  { key: 'tree_green3', x: 1080, y: 120 }, { key: 'tree_green', x: 1150, y: 205 },
  { key: 'tree_green2', x: 120, y: 660 }, { key: 'tree_green3', x: 1200, y: 650 },
  { key: 'tree_green', x: 110, y: 430 }, { key: 'tree_green2', x: 1180, y: 410 },
  { key: 'flower_pink', x: 320, y: 132 }, { key: 'flower_red', x: 520, y: 132 },
  { key: 'flower_blue', x: 720, y: 132 }, { key: 'flower_purple', x: 920, y: 132 },
  { key: 'lantern', x: 350, y: 200 }, { key: 'lantern', x: 550, y: 200 },
  { key: 'lantern', x: 750, y: 200 }, { key: 'lantern', x: 950, y: 200 },
  { key: 'lantern', x: 350, y: 540 }, { key: 'lantern', x: 550, y: 540 },
  { key: 'lantern', x: 750, y: 540 }, { key: 'lantern', x: 950, y: 540 },
  { key: 'mushroom', x: 150, y: 300 }, { key: 'mushroom', x: 1100, y: 500 },
  { key: 'bush', x: 90, y: 500 }, { key: 'bush', x: 1120, y: 350 }
]

export const HOUSES = [
  { x: 180, y: 200, v: 0 }, { x: 1180, y: 200, v: 1 },
  { x: 180, y: 770, v: 1 }, { x: 300, y: 850, v: 0 },
  { x: 1220, y: 770, v: 0 }, { x: 1400, y: 850, v: 1 },
  { x: 190, y: 990, v: 1 }, { x: 400, y: 990, v: 0 },
  { x: 600, y: 1010, v: 1 }, { x: 1060, y: 990, v: 0 },
  { x: 1250, y: 1010, v: 1 }, { x: 1420, y: 975, v: 0 },
  { x: 250, y: 1090, v: 0 }, { x: 520, y: 1100, v: 1 },
  { x: 1100, y: 1100, v: 1 }, { x: 1360, y: 1085, v: 0 }
]

// 四座军营沿校场北侧一字排开，紧挨着，方便玩家在城门口集中管理。
// 城墙没有独立建筑（就是城本身），所以这里只有四座军营。
export const BARRACKS = [
  { key: 'infantry', x: 420, y: 300 },
  { key: 'cavalry', x: 600, y: 300 },
  { key: 'armory', x: 780, y: 300 },
  { key: 'corps', x: 960, y: 300 }
]

const SHOP_NAMES = [
  '粮行', '铁匠铺', '药铺', '布庄', '酒肆', '杂货铺', '陶窑', '渔市'
]

const VENDOR_KEYS = [
  'merchant_red', 'merchant_green', 'merchant_purple', 'merchant_blue',
  'farmer', 'old_man', 'child', 'guard'
]

const SURNAMES = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫']
const GIVEN = ['大', '二', '三', '小', '九', '七', '五', '六', '八', '四']

// ---- c1 沿用原版集市的 NPC 与对白 ----
const C1_SHOPS = [
  {
    name: '水果摊', key: 'merchant_red', npc: '老张',
    lines: ['欢迎光临老张的水果摊！', '今天的苹果特别新鲜，是今早刚从果园摘的。', '要来一斤吗？只要5文钱！']
  },
  {
    name: '面包店', key: 'merchant_green', npc: '李婶',
    lines: ['香喷喷的面包出炉啦！', '我这面包可是祖传的手艺，方圆百里无人不知。', '来一个尝尝？刚出炉的最好吃！']
  },
  {
    name: '菜摊', key: 'merchant_purple', npc: '王大爷',
    lines: ['自家种的蔬菜，绿色无公害！', '番茄、黄瓜、茄子，样样都有。', '老王我种了三十年地了，品质保证！']
  },
  {
    name: '铁匠铺', key: 'farmer', npc: '铁匠赵',
    lines: ['叮叮当当...哦，有人来了。', '我打的菜刀可是远近闻名，切菜如泥！', '客官要不要来一把？保证好用！']
  },
  {
    name: '药材铺', key: 'merchant_blue', npc: '孙药师',
    lines: ['哎呀，看您面色不太好啊。', '我这有上好的人参、灵芝、枸杞...', '来来来，我给您配一副养生方子！']
  },
  {
    name: '布庄', key: 'guard', npc: '织女小芳',
    lines: ['客官好！来看看我们的布匹吧。', '丝绸、棉布、麻布，应有尽有。', '这个花色可是今年最流行的款式哦！']
  },
  {
    name: '酒馆', key: 'old_man', npc: '刘掌柜',
    lines: ['客官进来坐坐？来碗好酒？', '我这有上等的女儿红，还有陈年花雕。', '喝一杯解解乏，路还远着呢！']
  },
  {
    name: '杂货铺', key: 'merchant_green', npc: '赵大娘',
    lines: ['针线、纽扣、鞋底、头绳...', '您需要什么尽管挑！价格公道。', '买三样送一样，多买多送！']
  }
]

const C1_EXTRA = [
  {
    x: 480, y: 440, key: 'child', name: '小宝', wander: true,
    lines: ['嘿嘿，你是青禾城的新城主吧？', '这集市可热闹了！什么都有卖的。', '城主府就在中间那座大宅子里！']
  },
  {
    x: 600, y: 380, key: 'merchant_red', name: '神秘旅人', wander: false,
    lines: ['嘘...你知道吗，这片大地有九座城。', '月圆之夜，站在城墙上能望见八座敌城的火光。', '不过——它们得先踏过你的护城河才行。哈哈！']
  }
]

const C1_STEWARD = {
  x: 820, y: 730, key: 'old_man', name: '老管家', wander: false,
  lines: [
    '城主大人，青禾城内外平安。',
    '四座城门皆已设卡，商队与百姓照常通行。',
    '北面芦花城、南面桑落城都与我们接壤，西边还有白鹭城——那几位城主可都不安分。',
    '敌城攒够了兵就会来叩门，还请您常回府中练兵、修墙。'
  ]
}

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedOf(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeShopLines(city, i) {
  const f = city.flavor
  const g = f.goods
  const opener = [
    `欢迎来到${city.name}！${f.slogan}。`,
    `客官远道而来，${city.name}的${f.trade}可是一绝。`,
    `${f.slogan}，小店今日开张。`
  ][i % 3]
  return [
    opener,
    `我们这里最出名的是${f.trade}——${g[0]}、${g[1]}，都是本地好货。`,
    `价钱好商量。要不要来一份？城主大人在府里，${f.goods[2]}管够。`
  ]
}

function makeLordLines(city) {
  return [
    `我是${city.name}城主${city.lord}。`,
    `${city.intro}`,
    `此城已归你所有，我等听候调遣。`
  ]
}

export function buildCityContent(city) {
  const isHome = city.owner === 'player'

  const shops = STALL_SPOTS.map((spot, i) => {
    if (isHome) {
      const s = C1_SHOPS[i]
      return { ...spot, type: i % 4, name: s.name }
    }
    return { ...spot, type: i % 4, name: `${SHOP_NAMES[i]}${city.name.slice(0, 1)}号铺` }
  })

  const shopNpcs = SHOP_NPC_SPOTS.map((spot, i) => {
    if (isHome) {
      const s = C1_SHOPS[i]
      return { ...spot, key: s.key, name: s.npc, lines: s.lines, wander: false }
    }
    const r = rng(seedOf(city.id) + i * 977)
    const surname = SURNAMES[Math.floor(r() * SURNAMES.length)]
    const given = GIVEN[Math.floor(r() * GIVEN.length)]
    return {
      ...spot,
      key: VENDOR_KEYS[i % VENDOR_KEYS.length],
      name: `${surname}${given}`,
      lines: makeShopLines(city, i),
      wander: false
    }
  })

  const villagers = VILLAGER_SPOTS.map((spot, i) => {
    if (isHome) return null
    const r = rng(seedOf(city.id) + 4241 + i)
    const surname = SURNAMES[Math.floor(r() * SURNAMES.length)]
    return {
      ...spot,
      key: spot.key,
      name: `${surname}家${i === 0 ? '娃' : '老丈'}`,
      lines: [
        `${city.name}的${city.flavor.trade}生意做了三代了。`,
        `城主${city.lord}治下还算太平，我们这些小民就图个安稳。`,
        `听说城外不太平，客官路过城门当心些。`
      ],
      wander: true
    }
  }).filter(Boolean)

  // 玩家主城没有 NPC 城主（由玩家自己扮演），只有敌城才有守城主。
  const lord = isHome ? null : {
    x: 820, y: 730,
    key: 'lord',
    name: `城主 ${city.lord}`,
    lines: makeLordLines(city),
    wander: false
  }

  const extras = isHome ? C1_EXTRA.map(e => ({ ...e })) : []

  const steward = isHome ? { ...C1_STEWARD } : null

  return {
    shops,
    shopNpcs,
    villagers,
    lord,
    extras,
    steward,
    props: PROPS.map(p => ({ ...p })),
    houses: HOUSES.map(h => ({ ...h })),
    barracks: BARRACKS.map(b => ({ ...b }))
  }
}

export const ALL_CITY_CONTENT = Object.fromEntries(
  CITIES.map(city => [city.id, buildCityContent(city)])
)
