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
    autoCenter: Scale.CENTER_BOTH
  },
  pixelArt: false,
  roundPixels: true
}

const game = new Game(config)

// 调试与自动化测试用的把手，生产环境也能安全读取
if (typeof window !== 'undefined') window.__game = game

export default game
