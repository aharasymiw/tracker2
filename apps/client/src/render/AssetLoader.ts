import type { Texture } from 'pixi.js';
import { Assets } from 'pixi.js';

/**
 * Loader for placeholder textures used in Phase 0-2. A real asset manifest
 * with preloading and hash-keyed cache-busting arrives in Phase 3.
 */
export class AssetLoader {
  private readonly cache = new Map<string, Texture>();

  public async loadPlaceholder(key: string, url: string): Promise<Texture> {
    const existing = this.cache.get(key);
    if (existing !== undefined) return existing;
    const texture = (await Assets.load(url)) as Texture;
    this.cache.set(key, texture);
    return texture;
  }

  public get(key: string): Texture | undefined {
    return this.cache.get(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
