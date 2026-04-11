import { Application, Container, Text, TextStyle } from 'pixi.js';

export interface PixiAppOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Thin PixiJS v8 wrapper. Owns the root `Application`, the `scene` container
 * where the `WorldRenderer` will mount, and a minimal on-canvas FPS counter.
 * `init()` is async because Pixi v8's `Application.init()` is async.
 */
export class PixiApp {
  private readonly app: Application;
  private scene: Container | null = null;
  private fpsText: Text | null = null;
  private started = false;

  public constructor(private readonly opts: PixiAppOptions) {
    this.app = new Application();
  }

  public async init(): Promise<void> {
    if (this.started) return;
    await this.app.init({
      canvas: this.opts.canvas,
      width: this.opts.width,
      height: this.opts.height,
      backgroundColor: 0x0b0d12,
      antialias: false,
      resolution: window.devicePixelRatio > 0 ? window.devicePixelRatio : 1,
    });
    const scene = new Container();
    this.scene = scene;
    this.app.stage.addChild(scene);

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0x3ce24b,
    });
    const fpsText = new Text({ text: 'FPS: --', style });
    fpsText.position.set(8, 6);
    this.fpsText = fpsText;
    this.app.stage.addChild(fpsText);

    this.app.ticker.add(this.onTick);
    this.started = true;
  }

  /** Root scene container where renderers should attach their display objects. */
  public getScene(): Container | null {
    return this.scene;
  }

  public resize(width: number, height: number): void {
    if (!this.started) return;
    this.app.renderer.resize(width, height);
  }

  private onTick = (): void => {
    if (this.fpsText === null) return;
    const fps = this.app.ticker.FPS | 0;
    this.fpsText.text = `FPS: ${fps}`;
  };

  public destroy(): void {
    if (!this.started) return;
    this.app.ticker.remove(this.onTick);
    this.app.destroy(true, { children: true });
    this.scene = null;
    this.fpsText = null;
    this.started = false;
  }
}
