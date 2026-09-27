import { Scene } from 'phaser'

export class BootScene extends Scene {
  constructor() {
    super('BootScene')
  }

  create() {
    this.generateTerrainTextures()
    this.generateObjectTextures()
    this.generateFortressTextures()
    this.generatePlayerTextures()
    this.generateNPCTextures()
    this.generateBattleTextures()
    this.generateMonsterTextures()
    this.generateMonsterBattleTextures()
    this.generateUITextures()
    this.scene.start('WorldScene')
  }

  px(ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, 1, 1)
  }

  rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  randF(min, max) { return min + Math.random() * (max - min) }
  hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)` }

  generateTerrainTextures() {
    const T = 16

    // --- Grass ---
    this.makeTex('tile_grass', T, T, (ctx) => {
      ctx.fillStyle = '#4a8c3f'
      ctx.fillRect(0, 0, T, T)
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * T)
        const y = Math.floor(Math.random() * T)
        this.px(ctx, x, y, this.hsl(110 + Math.random() * 20, 45 + Math.random() * 20, 32 + Math.random() * 18))
      }
      // Grass blades
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(Math.random() * T)
        const y = Math.floor(Math.random() * T)
        ctx.fillStyle = this.hsl(115, 50, 40)
        ctx.fillRect(x, y, 1, 2)
      }
    })

    // --- Dirt ---
    this.makeTex('tile_dirt', T, T, (ctx) => {
      ctx.fillStyle = '#b8956a'
      ctx.fillRect(0, 0, T, T)
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * T)
        const y = Math.floor(Math.random() * T)
        this.px(ctx, x, y, this.hsl(28 + Math.random() * 8, 35 + Math.random() * 15, 50 + Math.random() * 20))
      }
      // Small stones
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(Math.random() * T)
        const y = Math.floor(Math.random() * T)
        ctx.fillStyle = '#9a8a7a'
        ctx.fillRect(x, y, 2, 1)
      }
    })

    // --- Cobblestone ---
    this.makeTex('tile_stone', T, T, (ctx) => {
      ctx.fillStyle = '#7a7a82'
      ctx.fillRect(0, 0, T, T)
      // Draw cobblestones
      const stones = [
        [1,1,6,5], [8,0,7,5], [0,7,5,6], [6,6,6,6], [13,7,3,6],
        [2,12,5,4], [8,12,6,4]
      ]
      stones.forEach(([sx, sy, sw, sh]) => {
        const g = 90 + Math.floor(Math.random() * 30)
        ctx.fillStyle = `rgb(${g},${g},${g+5})`
        ctx.beginPath()
        ctx.roundRect(sx, sy, sw, sh, 2)
        ctx.fill()
        ctx.strokeStyle = '#555'
        ctx.lineWidth = 0.5
        ctx.stroke()
      })
    })

    // --- Water ---
    this.makeTex('tile_water', T, T, (ctx) => {
      ctx.fillStyle = '#3388cc'
      ctx.fillRect(0, 0, T, T)
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * T)
        const y = Math.floor(Math.random() * T)
        this.px(ctx, x, y, this.hsl(200, 60, 50 + Math.random() * 15))
      }
      // Wave highlights
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(Math.random() * (T - 3))
        const y = Math.floor(Math.random() * T)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(x, y, 3, 1)
      }
    })
  }

  generateObjectTextures() {
    const T = 16

    // --- Barrel ---
    this.makeTex('obj_barrel', T, T, (ctx) => {
      // Body
      ctx.fillStyle = '#8B4513'
      ctx.beginPath()
      ctx.ellipse(8, 9, 6, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      // Bands
      ctx.strokeStyle = '#654321'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(8, 5, 6, 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(8, 12, 6, 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(5, 3, 2, 10)
    })

    // --- Crate ---
    this.makeTex('crate', 24, 24, (ctx) => {
      ctx.fillStyle = '#b8860b'
      ctx.beginPath()
      ctx.roundRect(1, 1, 22, 22, 2)
      ctx.fill()
      ctx.strokeStyle = '#8B6914'
      ctx.lineWidth = 1.5
      ctx.strokeRect(3, 3, 18, 18)
      ctx.beginPath()
      ctx.moveTo(12, 1); ctx.lineTo(12, 23)
      ctx.moveTo(1, 12); ctx.lineTo(23, 12)
      ctx.stroke()
      ctx.fillStyle = '#aaa'
      ;[[4,4],[20,4],[4,20],[20,20]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x,y,1.2,0,Math.PI*2); ctx.fill()
      })
    })

    // --- Well ---
    this.makeTex('well', 32, 40, (ctx) => {
      // Base
      ctx.fillStyle = '#888'
      ctx.fillRect(4, 20, 24, 16)
      ctx.fillStyle = '#999'
      ctx.beginPath()
      ctx.ellipse(16, 20, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      // Water
      ctx.fillStyle = '#4499cc'
      ctx.beginPath()
      ctx.ellipse(16, 22, 9, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(150,220,255,0.4)'
      ctx.beginPath()
      ctx.ellipse(14, 21, 3, 1, 0, 0, Math.PI * 2)
      ctx.fill()
      // Posts
      ctx.fillStyle = '#6B4914'
      ctx.fillRect(5, 2, 3, 20)
      ctx.fillRect(24, 2, 3, 20)
      // Roof
      ctx.fillStyle = '#aa5533'
      ctx.beginPath()
      ctx.moveTo(2, 6); ctx.lineTo(16, -2); ctx.lineTo(30, 6)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#883322'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // --- Trees ---
    ;['tree_green', 'tree_green2', 'tree_green3'].forEach((key, i) => {
      this.makeTex(key, 32, 40, (ctx) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.beginPath()
        ctx.ellipse(16, 38, 12, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        // Trunk
        ctx.fillStyle = '#6B4914'
        ctx.fillRect(13, 24, 6, 16)
        ctx.fillStyle = '#5a3a10'
        ctx.fillRect(13, 24, 2, 16)
        // Foliage layers
        const colors = [
          ['#2d8a37', '#38a745', '#45bb55'],
          ['#2a7a30', '#359940', '#42aa50'],
          ['#308838', '#3bb048', '#4cc058']
        ][i]
        ctx.fillStyle = colors[0]
        ctx.beginPath()
        ctx.arc(16, 16, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = colors[1]
        ctx.beginPath()
        ctx.arc(12, 14, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(20, 18, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = colors[2]
        ctx.beginPath()
        ctx.arc(14, 10, 5, 0, Math.PI * 2)
        ctx.fill()
        // Leaf detail
        for (let j = 0; j < 8; j++) {
          const lx = 6 + Math.floor(Math.random() * 20)
          const ly = 4 + Math.floor(Math.random() * 18)
          this.px(ctx, lx, ly, this.hsl(120, 40, 30 + Math.random() * 20))
        }
      })
    })

    // --- Sign ---
    this.makeTex('sign', 24, 28, (ctx) => {
      ctx.fillStyle = '#6B4914'
      ctx.fillRect(10, 14, 4, 14)
      ctx.fillStyle = '#b8860b'
      ctx.beginPath()
      ctx.roundRect(1, 2, 22, 14, 3)
      ctx.fill()
      ctx.strokeStyle = '#8B6914'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 7px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('集市', 12, 12)
    })

    // --- Lantern ---
    this.makeTex('lantern', 12, 16, (ctx) => {
      ctx.fillStyle = '#cc3333'
      ctx.beginPath()
      ctx.roundRect(2, 3, 8, 10, 2)
      ctx.fill()
      ctx.fillStyle = '#ff6633'
      ctx.beginPath()
      ctx.arc(6, 8, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#aa2222'
      ctx.fillRect(3, 3, 6, 1.5)
      ctx.fillRect(3, 11.5, 6, 1.5)
      ctx.fillStyle = 'rgba(255,150,50,0.12)'
      ctx.beginPath()
      ctx.arc(6, 8, 6, 0, Math.PI * 2)
      ctx.fill()
    })

    // --- Indicator ---
    this.makeTex('indicator', 14, 14, (ctx) => {
      ctx.fillStyle = '#ffcc00'
      ctx.beginPath()
      ctx.arc(7, 5, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(4, 8); ctx.lineTo(2, 13); ctx.lineTo(8, 9)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#333'
      ctx.font = 'bold 8px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('!', 7, 8)
    })

    // --- Flowers ---
    ;['flower_pink', 'flower_red', 'flower_blue', 'flower_purple'].forEach((key, i) => {
      const colors = ['#ff88aa', '#ee4444', '#4488ee', '#aa44cc']
      this.makeTex(key, 8, 8, (ctx) => {
        ctx.fillStyle = '#3a7a2a'
        ctx.fillRect(3, 4, 2, 4)
        ctx.fillStyle = colors[i]
        ctx.beginPath()
        ctx.arc(4, 3, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffee44'
        ctx.beginPath()
        ctx.arc(4, 3, 1, 0, Math.PI * 2)
        ctx.fill()
      })
    })

    // --- Mushroom ---
    this.makeTex('mushroom', 10, 10, (ctx) => {
      ctx.fillStyle = '#ddd'
      ctx.fillRect(4, 5, 3, 5)
      ctx.fillStyle = '#cc3333'
      ctx.beginPath()
      ctx.arc(5, 4, 4.5, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(4, 3, 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(7, 3, 0.8, 0, Math.PI * 2)
      ctx.fill()
    })

    // --- Bush ---
    this.makeTex('bush', 16, 12, (ctx) => {
      ctx.fillStyle = '#2d7a30'
      ctx.beginPath()
      ctx.arc(5, 7, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#38993d'
      ctx.beginPath()
      ctx.arc(11, 6, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#45aa4a'
      ctx.beginPath()
      ctx.arc(8, 4, 4, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 5; i++) {
        this.px(ctx, 3 + Math.floor(Math.random() * 10), 2 + Math.floor(Math.random() * 8), this.hsl(120, 35, 28 + Math.random() * 15))
      }
    })

    // --- Stalls ---
    const stallDefs = [
      { counter: '#cc6633', canopy: '#ff6633', accent: '#ff8844' },
      { counter: '#994422', canopy: '#cc4422', accent: '#dd6644' },
      { counter: '#668833', canopy: '#55aa33', accent: '#77cc55' },
      { counter: '#336699', canopy: '#3388cc', accent: '#55aaee' }
    ]
    stallDefs.forEach((s, i) => {
      this.makeTex(`stall_${i}`, 64, 56, (ctx) => {
        // Posts
        ctx.fillStyle = '#6B4914'
        ctx.fillRect(6, 16, 4, 36)
        ctx.fillRect(54, 16, 4, 36)
        ctx.fillStyle = '#5a3a10'
        ctx.fillRect(6, 16, 1.5, 36)
        ctx.fillRect(54, 16, 1.5, 36)
        // Counter
        ctx.fillStyle = s.counter
        ctx.beginPath()
        ctx.roundRect(2, 34, 60, 18, 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.fillRect(4, 35, 56, 4)
        // Canopy
        ctx.fillStyle = s.canopy
        ctx.beginPath()
        ctx.moveTo(0, 16)
        ctx.lineTo(64, 16)
        ctx.lineTo(60, 2)
        ctx.lineTo(4, 2)
        ctx.closePath()
        ctx.fill()
        // Canopy stripes
        ctx.fillStyle = s.accent
        for (let x = 4; x < 60; x += 12) {
          ctx.fillRect(x, 2, 6, 14)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(4, 14, 56, 2)
        // Goods
        const goods = ['#ffcc00', '#ff6633', '#33cc33', '#cc33cc', '#ff8844']
        for (let x = 8; x < 56; x += 10) {
          ctx.fillStyle = goods[Math.floor(Math.random() * goods.length)]
          ctx.beginPath()
          ctx.arc(x, 39, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    })
  }

  // 城防相关贴图。角楼/城楼/城主府/城旗画成灰阶，
  // 运行时用 setTint 染成各城颜色，一套贴图复用九城。
  generateFortressTextures() {
    const g = v => `rgb(${v},${v},${Math.min(255, v + 6)})`
    const outline = '#6e6e7c'

    // --- 角楼 ---
    this.makeTex('tower', 60, 76, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.beginPath()
      ctx.ellipse(30, 72, 27, 7, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = g(232)
      ctx.beginPath()
      ctx.moveTo(8, 74); ctx.lineTo(13, 24); ctx.lineTo(47, 24); ctx.lineTo(52, 74)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = g(202)
      ctx.beginPath()
      ctx.moveTo(8, 74); ctx.lineTo(13, 24); ctx.lineTo(21, 24); ctx.lineTo(17, 74)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(104,106,118,0.55)'
      ctx.lineWidth = 1
      for (let y = 32; y < 74; y += 9) {
        ctx.beginPath(); ctx.moveTo(9, y); ctx.lineTo(51, y); ctx.stroke()
      }

      // 垛口
      ctx.fillStyle = g(246)
      for (let i = 0; i < 4; i++) ctx.fillRect(8 + i * 12, 14, 8, 12)
      ctx.fillStyle = g(214)
      ctx.fillRect(6, 24, 48, 5)

      // 箭窗
      ctx.fillStyle = g(112)
      ctx.fillRect(26, 36, 8, 15)
      ctx.fillRect(26, 58, 8, 11)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(27, 37, 3, 13)
    })

    // --- 城楼（骑在城墙门洞上） ---
    this.makeTex('gatehouse', 150, 92, (ctx) => {
      const tower = (x) => {
        ctx.fillStyle = g(226)
        ctx.fillRect(x, 12, 40, 76)
        ctx.fillStyle = g(198)
        ctx.fillRect(x, 12, 9, 76)
        ctx.strokeStyle = 'rgba(104,106,118,0.5)'
        ctx.lineWidth = 1
        for (let y = 22; y < 88; y += 10) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.stroke()
        }
        ctx.fillStyle = g(244)
        for (let i = 0; i < 3; i++) ctx.fillRect(x - 2 + i * 14, 2, 9, 12)
        ctx.fillStyle = g(208)
        ctx.fillRect(x - 4, 12, 48, 5)
        ctx.fillStyle = g(116)
        ctx.fillRect(x + 16, 34, 8, 18)
      }
      tower(8)
      tower(102)

      // 券门
      ctx.strokeStyle = g(226)
      ctx.lineWidth = 15
      ctx.beginPath()
      ctx.arc(75, 88, 33, Math.PI, 0)
      ctx.stroke()
      ctx.strokeStyle = g(196)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(75, 88, 40, Math.PI, 0)
      ctx.stroke()

      // 门洞内的暗部
      ctx.fillStyle = '#3a3a46'
      ctx.beginPath()
      ctx.moveTo(48, 88)
      ctx.lineTo(48, 74)
      ctx.arc(75, 74, 27, Math.PI, 0)
      ctx.lineTo(102, 88)
      ctx.closePath()
      ctx.fill()

      // 城楼顶
      ctx.fillStyle = g(178)
      ctx.beginPath()
      ctx.moveTo(34, 34); ctx.lineTo(75, 4); ctx.lineTo(116, 34)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = g(214)
      ctx.beginPath()
      ctx.moveTo(34, 34); ctx.lineTo(75, 4); ctx.lineTo(75, 34)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = outline
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(34, 34); ctx.lineTo(75, 4); ctx.lineTo(116, 34)
      ctx.closePath()
      ctx.stroke()
    })

    // --- 城主府（196x152，实际建筑画在中央 150x120） ---
    this.makeTex('mansion', 196, 152, (ctx) => {
      const X = 23
      const Y = 16
      const W = 150
      const H = 120

      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(X + W / 2, Y + H - 2, W * 0.52, 9, 0, 0, Math.PI * 2)
      ctx.fill()

      // 台基
      ctx.fillStyle = g(214)
      ctx.fillRect(X + 8, Y + H - 22, W - 16, 20)
      ctx.fillStyle = g(236)
      ctx.fillRect(X + 20, Y + H - 30, W - 40, 10)

      // 正堂
      ctx.fillStyle = g(242)
      ctx.fillRect(X + 14, Y + 56, W - 28, H - 84)
      ctx.fillStyle = g(222)
      ctx.fillRect(X + 14, Y + 56, 10, H - 84)

      // 二楼
      ctx.fillStyle = g(236)
      ctx.fillRect(X + 34, Y + 34, W - 68, 26)
      ctx.fillStyle = g(216)
      ctx.fillRect(X + 34, Y + 34, 8, 26)

      // 大屋顶
      ctx.fillStyle = g(168)
      ctx.beginPath()
      ctx.moveTo(X + 2, Y + 36)
      ctx.lineTo(X + W / 2, Y)
      ctx.lineTo(X + W - 2, Y + 36)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = g(206)
      ctx.beginPath()
      ctx.moveTo(X + 2, Y + 36)
      ctx.lineTo(X + W / 2, Y)
      ctx.lineTo(X + W / 2, Y + 36)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = outline
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(X + 2, Y + 36)
      ctx.lineTo(X + W / 2, Y)
      ctx.lineTo(X + W - 2, Y + 36)
      ctx.closePath()
      ctx.stroke()

      // 门与窗
      ctx.fillStyle = '#4e4e5c'
      ctx.fillRect(X + 58, Y + H - 56, 34, 36)
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(X + 60, Y + H - 54, 30, 32)
      ctx.fillStyle = g(126)
      ctx.fillRect(X + 26, Y + 72, 16, 18)
      ctx.fillRect(X + W - 42, Y + 72, 16, 18)
      ctx.fillRect(X + 56, Y + 40, 14, 14)
      ctx.fillRect(X + W - 70, Y + 40, 14, 14)

      // 匾额
      ctx.fillStyle = g(120)
      ctx.fillRect(X + 52, Y + 64, 46, 14)
      ctx.fillStyle = g(238)
      ctx.fillRect(X + 54, Y + 66, 42, 10)
    })

    // --- 城旗（灰阶，供 tint） ---
    this.makeTex('flag', 22, 30, (ctx) => {
      ctx.fillStyle = g(150)
      ctx.fillRect(9, 2, 3, 28)
      ctx.fillStyle = g(255)
      ctx.beginPath()
      ctx.moveTo(12, 3); ctx.lineTo(22, 8); ctx.lineTo(12, 14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = g(236)
      ctx.fillRect(12, 16, 7, 5)
    })

    // --- 拒马（敌城落闸，有颜色） ---
    this.makeTex('portcullis', 96, 58, (ctx) => {
      ctx.fillStyle = '#3b2a1c'
      ctx.fillRect(0, 0, 96, 58)
      ctx.fillStyle = '#5a4028'
      ctx.fillRect(2, 2, 92, 6)
      ctx.fillRect(2, 50, 92, 6)
      ctx.fillRect(2, 2, 6, 54)
      ctx.fillRect(88, 2, 6, 54)
      ctx.fillStyle = '#8a8f9c'
      for (let i = 0; i < 6; i++) ctx.fillRect(10 + i * 14, 6, 5, 46)
      ctx.fillStyle = '#c8ccd8'
      ctx.fillRect(4, 26, 88, 5)
      ctx.fillStyle = '#cc3333'
      ctx.fillRect(4, 24, 88, 3)
    })

    // --- 吊桥 ---
    this.makeTex('bridge', 108, 64, (ctx) => {
      ctx.fillStyle = '#6b4a2a'
      ctx.fillRect(4, 4, 100, 56)
      for (let i = 0; i < 7; i++) {
        const v = 118 + Math.floor(Math.random() * 26)
        ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.72)},${Math.floor(v * 0.48)})`
        ctx.fillRect(6, 6 + i * 8, 96, 6)
      }
      ctx.fillStyle = '#4a3220'
      ctx.fillRect(0, 0, 6, 64)
      ctx.fillRect(102, 0, 6, 64)
      ctx.fillStyle = '#5c3d24'
      ctx.fillRect(0, 8, 108, 5)
      ctx.fillRect(0, 51, 108, 5)
    })

    // --- 民居 ---
    const houseDefs = [
      { wall: '#e8d9b8', roof: '#b5502f', door: '#6b4a2a' },
      { wall: '#dfe4ea', roof: '#4a6b8a', door: '#5a4632' },
      { wall: '#e6dcc8', roof: '#5f7a45', door: '#6b4a2a' }
    ]
    houseDefs.forEach((h, i) => {
      this.makeTex(`house_${i}`, 92, 80, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.beginPath()
        ctx.ellipse(46, 76, 38, 8, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = h.wall
        ctx.fillRect(16, 40, 60, 38)
        ctx.fillStyle = 'rgba(0,0,0,0.10)'
        ctx.fillRect(16, 40, 60, 6)

        ctx.fillStyle = h.roof
        ctx.beginPath()
        ctx.moveTo(6, 44); ctx.lineTo(46, 10); ctx.lineTo(86, 44)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.14)'
        ctx.beginPath()
        ctx.moveTo(6, 44); ctx.lineTo(46, 10); ctx.lineTo(46, 44)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(6, 44); ctx.lineTo(46, 10); ctx.lineTo(86, 44)
        ctx.closePath()
        ctx.stroke()

        ctx.fillStyle = h.door
        ctx.fillRect(40, 56, 14, 22)
        ctx.fillStyle = '#8fc4e8'
        ctx.fillRect(24, 50, 11, 11)
        ctx.fillRect(58, 50, 11, 11)
      })
    })

    // --- 三座军营：步兵营 / 骑兵营 / 军械库 ---
    // 同一套土墙+木架结构，靠旗帜、器械和配色区分职能，远看就能认出。
    const barrackDefs = [
      { key: 'infantry', wall: '#9c8b6a', roof: '#8a5a3c', flag: '#b8443a', tool: 'spear' },
      { key: 'cavalry', wall: '#a89878', roof: '#6d5a44', flag: '#3a72b8', tool: 'horse' },
      { key: 'armory', wall: '#8f8a80', roof: '#5f5a52', flag: '#c8a23a', tool: 'anvil' }
    ]
    barrackDefs.forEach((b) => {
      this.makeTex(`barracks_${b.key}`, 88, 84, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.beginPath()
        ctx.ellipse(44, 80, 36, 7, 0, 0, Math.PI * 2)
        ctx.fill()

        // 夯土墙
        ctx.fillStyle = b.wall
        ctx.fillRect(14, 38, 60, 40)
        ctx.fillStyle = 'rgba(0,0,0,0.10)'
        ctx.fillRect(14, 38, 60, 5)
        ctx.strokeStyle = 'rgba(0,0,0,0.16)'
        ctx.lineWidth = 1
        for (let i = 1; i < 4; i++) {
          ctx.beginPath()
          ctx.moveTo(14, 38 + i * 10)
          ctx.lineTo(74, 38 + i * 10)
          ctx.stroke()
        }

        // 木架大屋顶
        ctx.fillStyle = b.roof
        ctx.beginPath()
        ctx.moveTo(4, 42); ctx.lineTo(44, 8); ctx.lineTo(84, 42)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.13)'
        ctx.beginPath()
        ctx.moveTo(4, 42); ctx.lineTo(44, 8); ctx.lineTo(44, 42)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.30)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(4, 42); ctx.lineTo(44, 8); ctx.lineTo(84, 42)
        ctx.closePath()
        ctx.stroke()

        // 大门
        ctx.fillStyle = '#4a3a2a'
        ctx.beginPath()
        ctx.moveTo(34, 78); ctx.lineTo(34, 56); ctx.lineTo(54, 56); ctx.lineTo(54, 78)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(43, 56, 2, 22)

        // 职能标识
        ctx.fillStyle = b.flag
        if (b.tool === 'spear') {
          // 长矛架
          ctx.fillStyle = '#6b4f2e'
          ctx.fillRect(20, 56, 3, 22)
          ctx.fillRect(30, 56, 3, 22)
          for (let i = 0; i < 2; i++) {
            ctx.fillStyle = '#cfd6dd'
            ctx.fillRect(21 + i * 10, 44, 2, 16)
            ctx.fillStyle = b.flag
            ctx.fillRect(20 + i * 10, 40, 4, 5)
          }
        } else if (b.tool === 'horse') {
          // 马厩栏杆 + 马头
          ctx.fillStyle = '#6b4f2e'
          ctx.fillRect(60, 62, 3, 16)
          ctx.fillRect(72, 62, 3, 16)
          ctx.fillRect(60, 60, 15, 3)
          ctx.fillStyle = '#8a6a48'
          ctx.beginPath()
          ctx.ellipse(22, 66, 11, 8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(16, 60); ctx.lineTo(22, 48); ctx.lineTo(27, 59)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#241a12'
          ctx.fillRect(24, 60, 2, 2)
        } else {
          // 铁砧与箭靶
          ctx.fillStyle = '#4a4a52'
          ctx.fillRect(20, 68, 18, 5)
          ctx.fillRect(25, 60, 8, 8)
          ctx.fillStyle = '#6e6e78'
          ctx.fillRect(33, 64, 5, 4)
          ctx.fillStyle = '#d8c9a8'
          ctx.beginPath()
          ctx.arc(68, 66, 11, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = b.flag
          ctx.beginPath()
          ctx.arc(68, 66, 7, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#d8c9a8'
          ctx.beginPath()
          ctx.arc(68, 66, 3, 0, Math.PI * 2)
          ctx.fill()
        }

        // 旗杆
        ctx.fillStyle = '#5a4632'
        ctx.fillRect(80, 18, 2, 26)
        ctx.fillStyle = b.flag
        ctx.beginPath()
        ctx.moveTo(82, 18); ctx.lineTo(94, 22); ctx.lineTo(82, 27)
        ctx.closePath()
        ctx.fill()
      })
    })

    // --- 怪石 ---
    this.makeTex('rock', 26, 20, (ctx) => {
      ctx.fillStyle = '#8a8a92'
      ctx.beginPath()
      ctx.moveTo(2, 18); ctx.lineTo(6, 6); ctx.lineTo(15, 2); ctx.lineTo(23, 8); ctx.lineTo(24, 18)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#a8a8b0'
      ctx.beginPath()
      ctx.moveTo(6, 6); ctx.lineTo(15, 2); ctx.lineTo(18, 10); ctx.lineTo(9, 12)
      ctx.closePath()
      ctx.fill()
    })

    // --- 小地图玩家点 ---
    this.makeTex('mm_dot', 10, 10, (ctx) => {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(5, 5, 3.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#20242c'
      ctx.lineWidth = 1.4
      ctx.stroke()
    })
  }

  generatePlayerTextures() {
    const dirs = ['down', 'up', 'left', 'right']
    dirs.forEach(dir => {
      for (let f = 0; f < 4; f++) {
        this.makeTex(`player_${dir}_${f}`, 32, 48, (ctx) => {
          this.drawChar(ctx, 16, 24, f, '#4a9eff', '#ffcc99', dir, 1, false)
        })
      }
    })
  }

  generateNPCTextures() {
    const defs = [
      { name: 'merchant_red', body: '#cc3333', skin: '#ffcc99' },
      { name: 'merchant_green', body: '#33aa33', skin: '#deb887' },
      { name: 'merchant_purple', body: '#9933cc', skin: '#ffcc99' },
      { name: 'farmer', body: '#8B7355', skin: '#deb887' },
      { name: 'guard', body: '#444444', skin: '#ffcc99' },
      { name: 'child', body: '#ff9933', skin: '#ffcc99', scale: 0.8 },
      { name: 'old_man', body: '#666699', skin: '#deb887' },
      { name: 'merchant_blue', body: '#3366cc', skin: '#ffcc99' },
      { name: 'lord', body: '#c8a020', skin: '#ffcc99' }
    ]
    const dirs = ['down', 'up', 'left', 'right']
    defs.forEach(npc => {
      dirs.forEach(dir => {
        for (let f = 0; f < 4; f++) {
          const s = npc.scale || 1
          this.makeTex(`npc_${npc.name}_${dir}_${f}`, 32, 48, (ctx) => {
            this.drawChar(ctx, 16, 24, f, npc.body, npc.skin, dir, s, true)
          })
        }
      })
    })
  }

  drawChar(ctx, cx, cy, frame, bodyColor, skinColor, dir, scale, isNPC) {
    ctx.save()
    ctx.scale(scale, scale)
    const b = [0, -1, 0, 1][frame]
    const lo = [0, 2, 0, -2][frame]

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(cx, 46, 9, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    ctx.fillStyle = '#554433'
    ctx.fillRect(cx - 5 + lo, 34, 4, 11)
    ctx.fillRect(cx + 1 - lo, 34, 4, 11)
    // Shoes
    ctx.fillStyle = '#3a2a1a'
    ctx.fillRect(cx - 6 + lo, 43, 5, 3)
    ctx.fillRect(cx + 1 - lo, 43, 5, 3)

    // Body
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.roundRect(cx - 7, 20 + b, 14, 16, 3)
    ctx.fill()
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(cx - 5, 21 + b, 5, 10)
    // Belt
    ctx.fillStyle = '#5a3a1a'
    ctx.fillRect(cx - 7, 32 + b, 14, 2)

    // Arms
    const as = frame % 2 === 0 ? 2 : -2
    ctx.fillStyle = skinColor
    ctx.fillRect(cx - 10, 22 + b + as, 3.5, 10)
    ctx.fillRect(cx + 6.5, 22 + b - as, 3.5, 10)

    // Head
    ctx.fillStyle = skinColor
    ctx.beginPath()
    ctx.arc(cx, 14 + b, 8, 0, Math.PI * 2)
    ctx.fill()

    // Hair
    ctx.fillStyle = isNPC ? '#4a3728' : '#5a4738'
    ctx.beginPath()
    ctx.arc(cx, 11 + b, 8, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(cx - 7, 7 + b, 14, 5)

    // Eyes
    if (dir === 'down') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(cx - 4, 13 + b, 3, 2.5)
      ctx.fillRect(cx + 1, 13 + b, 3, 2.5)
      ctx.fillStyle = '#222'
      ctx.fillRect(cx - 3, 13.5 + b, 1.5, 1.5)
      ctx.fillRect(cx + 2, 13.5 + b, 1.5, 1.5)
    } else if (dir === 'left') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(cx - 5, 13 + b, 3, 2.5)
      ctx.fillStyle = '#222'
      ctx.fillRect(cx - 4, 13.5 + b, 1.5, 1.5)
    } else if (dir === 'right') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(cx + 2, 13 + b, 3, 2.5)
      ctx.fillStyle = '#222'
      ctx.fillRect(cx + 3, 13.5 + b, 1.5, 1.5)
    }

    // Mouth
    if (dir === 'down') {
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(cx, 17 + b, 1.5, 0.2, Math.PI - 0.2)
      ctx.stroke()
    }

    // Blush
    if (dir === 'down') {
      ctx.fillStyle = 'rgba(255,140,140,0.25)'
      ctx.beginPath()
      ctx.ellipse(cx - 5, 15 + b, 1.8, 1.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx + 5, 15 + b, 1.8, 1.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // 攻城战的交战双方：蓝方为进攻的我们，红方为守城 NPC。
  // 复用 drawChar 保证和场景里其他人物同一套体型，额外补上武器/坐骑。
  generateBattleTextures() {
    const sides = [
      { tag: 'atk', body: '#3a72b8', dir: 'up' },
      { tag: 'def', body: '#c0392b', dir: 'down' }
    ]
    for (const s of sides) {
      // 步卒：长枪（攻）/ 圆盾（守）
      for (let f = 0; f < 4; f++) {
        this.makeTex(`bat_${s.tag}_foot_${f}`, 32, 48, (ctx) => {
          this.drawChar(ctx, 16, 24, f, s.body, '#ffcc99', s.dir, 1, true)
          if (s.tag === 'atk') {
            ctx.strokeStyle = '#8a6a3a'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(23, 44)
            ctx.lineTo(23, 10)
            ctx.stroke()
            ctx.fillStyle = '#d8d8e0'
            ctx.beginPath()
            ctx.moveTo(23, 6)
            ctx.lineTo(26.5, 12)
            ctx.lineTo(19.5, 12)
            ctx.closePath()
            ctx.fill()
          } else {
            ctx.fillStyle = '#8a5a3a'
            ctx.beginPath()
            ctx.ellipse(7, 27, 5.5, 7, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#c8a020'
            ctx.beginPath()
            ctx.ellipse(7, 27, 2.5, 3, 0, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }
      // 骑兵：马身 + 缩小骑手
      for (let f = 0; f < 4; f++) {
        this.makeTex(`bat_${s.tag}_cav_${f}`, 48, 48, (ctx) => {
          const leg = [0, 2, 0, -2][f]
          // 马腿
          ctx.strokeStyle = '#5a4632'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(16, 34); ctx.lineTo(15 + leg, 44)
          ctx.moveTo(30, 34); ctx.lineTo(31 - leg, 44)
          ctx.stroke()
          // 马身
          ctx.fillStyle = s.tag === 'atk' ? '#4a4038' : '#5c4034'
          ctx.beginPath()
          ctx.roundRect(12, 20, 24, 16, 5)
          ctx.fill()
          // 马头
          ctx.beginPath()
          ctx.roundRect(30, 14, 12, 10, 4)
          ctx.fill()
          ctx.fillStyle = '#222'
          ctx.fillRect(35, 17, 2, 2)
          // 尾巴
          ctx.strokeStyle = s.tag === 'atk' ? '#4a4038' : '#5c4034'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(13, 24)
          ctx.quadraticCurveTo(6, 28 + leg, 7, 36)
          ctx.stroke()
          // 骑手（缩到 0.72 坐在马背上）
          this.drawChar(ctx, 24, 6, f, s.body, '#ffcc99', s.dir, 0.72, true)
        })
      }
    }
  }

  // 野怪立绘：世界地图上固定 48x44，脚底锚点在 (24, 42)，
  // 顶部留一点空档给血条/名字。怪物只在城外野外出现。
  generateMonsterTextures() {
    const kinds = ['wolf', 'bandit', 'boar', 'bear', 'rebel']
    for (const kind of kinds) {
      this.makeTex(`monster_${kind}`, 48, 44, (ctx) => {
        this.drawMonster(ctx, 24, 42, kind, 0)
      })
    }

    // --- 怪物营地：野怪盘踞时的野外据点 ---
    this.makeTex('monster_camp', 72, 56, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(36, 51, 31, 4.6, 0, 0, Math.PI * 2)
      ctx.fill()

      // 破兽皮帐篷
      ctx.fillStyle = '#7a5a3a'
      ctx.beginPath()
      ctx.moveTo(8, 50); ctx.lineTo(32, 12); ctx.lineTo(56, 50)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#5a3f28'
      ctx.beginPath()
      ctx.moveTo(8, 50); ctx.lineTo(32, 12); ctx.lineTo(32, 50)
      ctx.closePath()
      ctx.fill()
      // 缝线
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(20, 34); ctx.lineTo(44, 34)
      ctx.moveTo(32, 12); ctx.lineTo(32, 50)
      ctx.stroke()
      // 门口
      ctx.fillStyle = '#2f2418'
      ctx.beginPath()
      ctx.moveTo(26, 50); ctx.lineTo(32, 32); ctx.lineTo(38, 50)
      ctx.closePath()
      ctx.fill()
      // 顶上的交叉撑杆
      ctx.fillStyle = '#5a4632'
      ctx.fillRect(31, 4, 2, 10)
      ctx.fillRect(28, 8, 8, 2)

      // 骷髅挂杆
      ctx.fillStyle = '#5a4632'
      ctx.fillRect(61, 18, 2, 33)
      ctx.fillStyle = '#e8e0d0'
      ctx.beginPath()
      ctx.arc(62, 15, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(59, 17, 6, 4)
      ctx.fillStyle = '#2a2a30'
      ctx.beginPath()
      ctx.arc(60.5, 14.5, 1.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(63.5, 14.5, 1.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(60.5, 19, 3, 1)

      // 篝火（画在最前面）
      ctx.strokeStyle = '#3a2a1a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(8, 53); ctx.lineTo(26, 48)
      ctx.moveTo(10, 47); ctx.lineTo(25, 53)
      ctx.stroke()
      ctx.fillStyle = '#ff8833'
      ctx.beginPath()
      ctx.moveTo(17, 32)
      ctx.quadraticCurveTo(25, 43, 17, 51)
      ctx.quadraticCurveTo(9, 43, 17, 32)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffcc44'
      ctx.beginPath()
      ctx.moveTo(17, 40)
      ctx.quadraticCurveTo(21, 46, 17, 51)
      ctx.quadraticCurveTo(13, 46, 17, 40)
      ctx.closePath()
      ctx.fill()
    })

    // --- 已清理的营地：只剩焦土、断矛和倒地的小旗 ---
    this.makeTex('monster_cleared', 56, 40, (ctx) => {
      // 烧焦的地面
      ctx.fillStyle = '#3a3228'
      ctx.beginPath()
      ctx.ellipse(28, 28, 21, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#241f18'
      ctx.beginPath()
      ctx.ellipse(28, 28, 13, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      // 灰烬
      ctx.fillStyle = '#8a8a8a'
      ;[[19, 25], [30, 32], [36, 25], [24, 33], [33, 22]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill()
      })
      ctx.fillStyle = '#6a6a6a'
      ctx.beginPath()
      ctx.ellipse(23, 30, 3, 1.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(34, 27, 2.4, 1.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // 两支折断的长矛交叉躺着
      ctx.strokeStyle = '#6b4f2e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(12, 33); ctx.lineTo(24, 21)
      ctx.moveTo(30, 15); ctx.lineTo(36, 9)
      ctx.moveTo(44, 33); ctx.lineTo(32, 21)
      ctx.moveTo(26, 15); ctx.lineTo(20, 9)
      ctx.stroke()
      ctx.fillStyle = '#cfd6dd'
      ctx.beginPath()
      ctx.moveTo(9, 36); ctx.lineTo(14, 31); ctx.lineTo(14, 36)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(47, 36); ctx.lineTo(42, 31); ctx.lineTo(42, 36)
      ctx.closePath()
      ctx.fill()

      // 倒地的小旗
      ctx.fillStyle = '#5a4632'
      ctx.fillRect(6, 35, 22, 2)
      ctx.fillStyle = '#2a2a30'
      ctx.beginPath()
      ctx.moveTo(8, 35); ctx.lineTo(20, 32); ctx.lineTo(28, 36); ctx.lineTo(12, 37)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#3a3a44'
      ctx.beginPath()
      ctx.moveTo(24, 35); ctx.lineTo(30, 33); ctx.lineTo(32, 36); ctx.lineTo(26, 36.5)
      ctx.closePath()
      ctx.fill()
    })
  }

  // 会战帧：48x48，和世界立绘同一套画法，只额外加待机浮动。
  // 会战里 origin 设 (0.5, 0.9)，所以着地点同样落在 y=42 附近。
  generateMonsterBattleTextures() {
    const kinds = ['wolf', 'bandit', 'boar', 'bear', 'rebel']
    for (const kind of kinds) {
      for (let f = 0; f < 4; f++) {
        this.makeTex(`bat_mon_${kind}_${f}`, 48, 48, (ctx) => {
          this.drawMonster(ctx, 24, 42, kind, f)
        })
      }
    }
  }

  // 怪物唯一的画法：cx/cy 是脚底着地点，frame 只用来做待机浮动（世界贴图传 0）。
  // 人形怪复用 drawChar（它的鞋底固定在 y=46），整体上移使脚正好踩在锚点上。
  drawMonster(ctx, cx, cy, kind, frame) {
    const bob = [0, -1, 0, 1][frame] || 0
    const lean = [-1, 0, 1, 0][frame] || 0

    ctx.save()
    ctx.translate(lean, bob)

    // 阴影略微抬高，避免在世界贴图底边被切平
    const shadow = (rx, ry) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(cx, cy - 1.5, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    if (kind === 'wolf') {
      shadow(12, 3)
      // 四条腿
      ctx.fillStyle = '#6a6f7c'
      ctx.fillRect(cx - 12, cy - 10, 3, 10)
      ctx.fillRect(cx - 6, cy - 10, 3, 10)
      ctx.fillRect(cx + 5, cy - 10, 3, 10)
      ctx.fillRect(cx + 11, cy - 10, 3, 10)
      // 蓬松尾巴
      ctx.fillStyle = '#8a8f9c'
      ctx.beginPath()
      ctx.moveTo(cx - 12, cy - 14)
      ctx.quadraticCurveTo(cx - 23, cy - 23, cx - 19, cy - 6)
      ctx.quadraticCurveTo(cx - 15, cy - 9, cx - 12, cy - 11)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#6a6f7c'
      ctx.beginPath()
      ctx.ellipse(cx - 19.5, cy - 14, 3, 4, -0.5, 0, Math.PI * 2)
      ctx.fill()
      // 身体
      ctx.fillStyle = '#8a8f9c'
      ctx.beginPath()
      ctx.roundRect(cx - 13, cy - 18, 27, 12, 5)
      ctx.fill()
      ctx.fillStyle = '#6a6f7c'
      ctx.beginPath()
      ctx.roundRect(cx - 13, cy - 18, 27, 4, 3)
      ctx.fill()
      // 白肚皮
      ctx.fillStyle = '#dfe4ea'
      ctx.beginPath()
      ctx.ellipse(cx - 1, cy - 8, 8, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()
      // 头
      ctx.fillStyle = '#8a8f9c'
      ctx.beginPath()
      ctx.roundRect(cx + 8, cy - 24, 13, 11, 4)
      ctx.fill()
      // 尖耳
      ctx.fillStyle = '#6a6f7c'
      ctx.beginPath()
      ctx.moveTo(cx + 9, cy - 23); ctx.lineTo(cx + 11, cy - 30); ctx.lineTo(cx + 15, cy - 23)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx + 15, cy - 23); ctx.lineTo(cx + 18, cy - 31); ctx.lineTo(cx + 21, cy - 23)
      ctx.closePath()
      ctx.fill()
      // 口鼻
      ctx.fillStyle = '#6a6f7c'
      ctx.beginPath()
      ctx.moveTo(cx + 21, cy - 21); ctx.lineTo(cx + 23, cy - 18); ctx.lineTo(cx + 21, cy - 14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.arc(cx + 22, cy - 19, 1.1, 0, Math.PI * 2)
      ctx.fill()
      // 发光的红眼
      ctx.fillStyle = 'rgba(224,85,85,0.30)'
      ctx.beginPath()
      ctx.arc(cx + 17, cy - 19, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e05555'
      ctx.beginPath()
      ctx.arc(cx + 17, cy - 19, 1.6, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'boar') {
      shadow(14, 3)
      // 短腿
      ctx.fillStyle = '#4a3220'
      ctx.fillRect(cx - 13, cy - 9, 4, 9)
      ctx.fillRect(cx - 6, cy - 9, 4, 9)
      ctx.fillRect(cx + 5, cy - 9, 4, 9)
      ctx.fillRect(cx + 12, cy - 9, 4, 9)
      // 背脊上的硬毛三角
      ctx.fillStyle = '#3a2a1a'
      for (let i = 0; i < 6; i++) {
        const x = cx - 12 + i * 5
        ctx.beginPath()
        ctx.moveTo(x, cy - 19); ctx.lineTo(x + 2.5, cy - 26); ctx.lineTo(x + 5, cy - 19)
        ctx.closePath()
        ctx.fill()
      }
      // 粗壮身体
      ctx.fillStyle = '#6b4a2a'
      ctx.beginPath()
      ctx.roundRect(cx - 14, cy - 20, 29, 15, 8)
      ctx.fill()
      ctx.fillStyle = '#4a3220'
      ctx.beginPath()
      ctx.roundRect(cx - 14, cy - 20, 29, 5, 4)
      ctx.fill()
      // 低垂的大头
      ctx.fillStyle = '#6b4a2a'
      ctx.beginPath()
      ctx.roundRect(cx + 9, cy - 15, 13, 13, 6)
      ctx.fill()
      ctx.fillStyle = '#4a3220'
      ctx.beginPath()
      ctx.roundRect(cx + 16, cy - 8, 7, 6, 3)
      ctx.fill()
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.arc(cx + 19.5, cy - 6, 0.9, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 22, cy - 6, 0.9, 0, Math.PI * 2)
      ctx.fill()
      // 白獠牙
      ctx.fillStyle = '#f0ead8'
      ctx.beginPath()
      ctx.moveTo(cx + 15, cy - 6); ctx.lineTo(cx + 20, cy - 13); ctx.lineTo(cx + 18, cy - 4)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx + 19, cy - 6); ctx.lineTo(cx + 23, cy - 12); ctx.lineTo(cx + 21, cy - 4)
      ctx.closePath()
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.arc(cx + 13, cy - 12, 1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.arc(cx + 13.5, cy - 12.5, 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'bear') {
      shadow(15, 3)
      // 四条粗腿
      ctx.fillStyle = '#241c18'
      ctx.fillRect(cx - 14, cy - 15, 5, 15)
      ctx.fillRect(cx - 5, cy - 15, 5, 15)
      ctx.fillRect(cx + 4, cy - 15, 5, 15)
      ctx.fillRect(cx + 12, cy - 15, 5, 15)
      // 身体
      ctx.fillStyle = '#3a2f28'
      ctx.beginPath()
      ctx.roundRect(cx - 15, cy - 27, 31, 17, 8)
      ctx.fill()
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.roundRect(cx - 15, cy - 27, 31, 5, 4)
      ctx.fill()
      // 肩上的爪痕
      ctx.strokeStyle = '#8a7a6a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - 11, cy - 22); ctx.lineTo(cx - 7, cy - 16)
      ctx.moveTo(cx - 8, cy - 22); ctx.lineTo(cx - 4, cy - 16)
      ctx.moveTo(cx - 5, cy - 22); ctx.lineTo(cx - 1, cy - 16)
      ctx.stroke()
      // 头
      ctx.fillStyle = '#3a2f28'
      ctx.beginPath()
      ctx.roundRect(cx + 7, cy - 31, 15, 15, 7)
      ctx.fill()
      // 圆耳
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.arc(cx + 10, cy - 32, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 19, cy - 32, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#8a7a6a'
      ctx.beginPath()
      ctx.arc(cx + 10, cy - 32, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 19, cy - 32, 2, 0, Math.PI * 2)
      ctx.fill()
      // 浅色口鼻
      ctx.fillStyle = '#8a7a6a'
      ctx.beginPath()
      ctx.roundRect(cx + 14, cy - 24, 8, 7, 3)
      ctx.fill()
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.roundRect(cx + 20, cy - 24, 3, 2.5, 1)
      ctx.fill()
      ctx.strokeStyle = '#241c18'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(cx + 18, cy - 19); ctx.lineTo(cx + 22, cy - 19)
      ctx.stroke()
      // 眼睛
      ctx.fillStyle = '#e8e0d0'
      ctx.beginPath()
      ctx.arc(cx + 11, cy - 26, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#241c18'
      ctx.beginPath()
      ctx.arc(cx + 11, cy - 26, 0.9, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 山贼 / 流寇：人形，复用 drawChar 保持和其他人同一套体型
      const rebel = kind === 'rebel'
      ctx.save()
      ctx.translate(0, cy - 46)
      if (rebel) {
        // 身后的旗杆与黑旗
        ctx.fillStyle = '#5a4632'
        ctx.fillRect(cx + 11, 5, 2, 41)
        ctx.fillStyle = '#2a2a30'
        ctx.beginPath()
        ctx.moveTo(cx + 13, 6); ctx.lineTo(cx + 22, 11); ctx.lineTo(cx + 13, 17)
        ctx.closePath()
        ctx.fill()
      }
      this.drawChar(ctx, 24, 22, 0, rebel ? '#5a3a5a' : '#4a4a52', '#d8a878', 'down', 1, true)
      if (rebel) {
        // 铁盔带
        ctx.fillStyle = '#8a8f9c'
        ctx.fillRect(cx - 8, 9.5, 16, 4)
        ctx.fillStyle = '#6e7480'
        ctx.fillRect(cx - 8, 13, 16, 1)
      } else {
        // 额上的红头巾
        ctx.fillStyle = '#c0392b'
        ctx.fillRect(cx - 8, 9.5, 16, 4)
        ctx.beginPath()
        ctx.moveTo(cx - 8, 10); ctx.lineTo(cx - 13, 14); ctx.lineTo(cx - 8, 13)
        ctx.closePath()
        ctx.fill()
        // 手里的弯刀
        ctx.strokeStyle = '#cfd6dd'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(cx + 8, 30)
        ctx.quadraticCurveTo(cx + 15, 22, cx + 11, 13)
        ctx.stroke()
        ctx.strokeStyle = '#5a3a1a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx + 7, 33); ctx.lineTo(cx + 9, 29)
        ctx.stroke()
      }
      ctx.restore()
    }

    ctx.restore()
  }

  generateUITextures() {
    const dw = 600, dh = 120
    this.makeTex('dialogue_bg', dw, dh, (ctx) => {
      ctx.fillStyle = 'rgba(15, 12, 25, 0.92)'
      ctx.beginPath()
      ctx.roundRect(0, 0, dw, dh, 12)
      ctx.fill()
      ctx.strokeStyle = '#ffcc00'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(2, 2, dw - 4, dh - 4, 10)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,204,0,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(6, 6, dw - 12, dh - 12, 8)
      ctx.stroke()
      ctx.fillStyle = '#ffcc00'
      ;[[12,12],[dw-12,12],[12,dh-12],[dw-12,dh-12]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill()
      })
    })
  }

  makeTex(key, w, h, drawFn) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    drawFn(ctx)
    this.textures.addCanvas(key, canvas)
  }
}
