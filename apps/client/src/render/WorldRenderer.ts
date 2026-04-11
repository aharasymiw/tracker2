import type { Container } from 'pixi.js';
import type { WorldState } from '../state/worldStore';

/**
 * WorldRenderer diffs the Zustand `worldStore` into a PixiJS scene graph.
 *
 * Phase 0-2: stub only. The renderer holds a reference to the scene container
 * and exposes an `update` method that will be called once per animation
 * frame. Actual sprite/tile-map diffing lands in Phase 4 once the protocol
 * entity shapes are narrowed.
 */
export class WorldRenderer {
  public constructor(private readonly scene: Container) {}

  public update(_state: WorldState): void {
    // Intentionally empty — real implementation in Phase 4.
    void this.scene;
  }

  public destroy(): void {
    // No owned children yet.
  }
}
