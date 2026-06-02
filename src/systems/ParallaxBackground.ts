import Phaser from "phaser";

/**
 * Multi-layer parallax background. Four scroll layers (sky → mountains → mid
 * islands/clouds → foreground), each a viewport-filling `TileSprite` pinned to the
 * camera (`scrollFactor 0`) whose `tilePositionX` is driven by `camera.scrollX *
 * factor`, giving seamless horizontal parallax. Re-fits on resize so there are no
 * gaps at any aspect ratio. Placeholder textures are generated at runtime; real
 * painterly art arrives in Phase 5.
 */

const TEX_W = 512;
const TEX_H = 768;

interface LayerConfig {
  key: string;
  factor: number;
  depth: number;
  build: (scene: Phaser.Scene, key: string) => void;
}

function ensureSky(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, TEX_W, TEX_H);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, "#ffe1ad"); // warm gold (upper)
  grad.addColorStop(0.45, "#cfe8f2");
  grad.addColorStop(1, "#7fb2e6"); // blue (lower)
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  canvas.refresh();
}

function ensureMountains(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x6f8cb6, 1);
  const base = TEX_H;
  // 128px-period peaks → seamless across the 512px-wide tile.
  for (let x = -64; x <= TEX_W + 64; x += 128) {
    g.fillTriangle(x, base, x + 64, base - 200, x + 128, base);
  }
  g.fillRect(0, base - 24, TEX_W, 24);
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
}

function ensureMid(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  // soft clouds
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(96, 150, 150, 56);
  g.fillEllipse(300, 96, 190, 64);
  g.fillEllipse(470, 180, 120, 48);
  // a far floating-island silhouette
  g.fillStyle(0x73b06a, 0.6);
  g.fillEllipse(240, TEX_H - 200, 200, 56);
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
}

function ensureForeground(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x2f5e3f, 0.9);
  g.fillRect(0, TEX_H - 90, TEX_W, 90);
  g.fillStyle(0x356b46, 0.9);
  for (let x = 0; x <= TEX_W; x += 128) {
    g.fillEllipse(x, TEX_H - 90, 150, 70);
  }
  g.generateTexture(key, TEX_W, TEX_H);
  g.destroy();
}

const LAYER_CONFIGS: LayerConfig[] = [
  { key: "bg-sky", factor: 0.05, depth: -40, build: ensureSky },
  { key: "bg-mountains", factor: 0.25, depth: -30, build: ensureMountains },
  { key: "bg-mid", factor: 0.5, depth: -20, build: ensureMid },
  { key: "bg-foreground", factor: 0.8, depth: -10, build: ensureForeground },
];

export class ParallaxBackground {
  private readonly scene: Phaser.Scene;
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private readonly onResize = (): void => this.fit();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    for (const cfg of LAYER_CONFIGS) {
      cfg.build(scene, cfg.key);
      const sprite = scene.add
        .tileSprite(0, 0, width, height, cfg.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(cfg.depth);
      this.layers.push({ sprite, factor: cfg.factor });
    }
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.fit();
  }

  /** Drive parallax from the camera scroll each frame. */
  update(scrollX: number, scrollY: number): void {
    for (const { sprite, factor } of this.layers) {
      sprite.tilePositionX = scrollX * factor;
      sprite.tilePositionY = scrollY * factor * 0.3;
    }
  }

  private fit(): void {
    const { width, height } = this.scene.scale;
    for (const { sprite } of this.layers) {
      sprite.setSize(width, height);
    }
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    for (const { sprite } of this.layers) sprite.destroy();
    this.layers.length = 0;
  }
}
