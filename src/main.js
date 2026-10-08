import { Game, Scale } from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { WorldScene } from './scenes/WorldScene.js'

const config = {
  type: 0,  // AUTO
  width: 1024,
  height: 768,
  backgroundColor: '#1d2a1c',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, WorldScene],
  scale: {
    mode: Scale.FIT,
    // Phaser 的 CENTER_BOTH 只写 margin-left / margin-top，不写右边和下边，
    // 叠在 body 的 flex 居中上会把画布整体推歪。居中交给 CSS，这里必须关掉。
    autoCenter: Scale.NO_CENTER
  },
  // 移动端：禁止长按弹出系统菜单，避免误触打断操作
  disableContextMenu: true,
  pixelArt: false,
  roundPixels: true
}

const game = new Game(config)

// 调试与自动化测试用的把手，生产环境也能安全读取
if (typeof window !== 'undefined') window.__game = game

export default game
