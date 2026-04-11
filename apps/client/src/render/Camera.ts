import type { Container } from 'pixi.js';

/**
 * Tile-aligned camera. Tracks a `target` world tile and exposes a `follow`
 * method that will pan the scene container toward that position.
 *
 * Phase 0-2: stub only.
 */
export class Camera {
  public constructor(
    private readonly scene: Container,
    public tileSize = 16,
  ) {}

  public follow(worldX: number, worldY: number): void {
    void this.scene;
    void worldX;
    void worldY;
  }

  public setTileSize(tileSize: number): void {
    this.tileSize = tileSize;
  }
}
