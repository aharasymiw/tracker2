import { Howl } from 'howler';

/**
 * Minimal music playback wrapper around Howler. Phase 0-2 stub — the full
 * MOD/XM chiptune playback pipeline arrives in a later phase.
 */
export class MusicPlayer {
  private current: Howl | null = null;

  public play(url: string, loop = true): void {
    this.stop();
    this.current = new Howl({ src: [url], loop, volume: 0.5 });
    this.current.play();
  }

  public stop(): void {
    if (this.current !== null) {
      this.current.stop();
      this.current.unload();
      this.current = null;
    }
  }

  public setVolume(volume: number): void {
    if (this.current !== null) {
      this.current.volume(volume);
    }
  }
}
