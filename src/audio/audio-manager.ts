import type { AmbientName, EffectName } from './sounds';

/** Abstraction du lecteur (expo-audio en production, simulé en test). */
export interface PlayerLike {
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  volume: number;
  loop: boolean;
  remove(): void;
}

export interface AudioBackend {
  createPlayer(source: unknown): PlayerLike;
  setMode(opts: { playsInSilentMode: boolean }): Promise<void>;
  speak(text: string, volume: number): void;
  stopSpeech(): void;
}

export interface AudioPrefs {
  muted: boolean;
  discreet: boolean;
  ambientVolume: number;
  effectsVolume: number;
  narrationEnabled: boolean;
  narrationVolume: number;
  playInSilentMode: boolean;
}

export type Scene = AmbientName | 'none';

/**
 * Gestion centralisée du son :
 *  - une seule ambiance à la fois (pas de superposition) ;
 *  - un lecteur par effet, relancé depuis le début (pas d'empilement) ;
 *  - mode discret / sourdine : aucun son ;
 *  - mise en pause en arrière-plan, reprise au retour ;
 *  - toute erreur est captée et exposée, jamais propagée à l'interface.
 * Les sons sont génériques : aucun ne dépend d'une information secrète.
 */
export class AudioManager {
  private prefs: AudioPrefs;
  private scene: Scene = 'none';
  private ambientPlayers = new Map<AmbientName, PlayerLike>();
  private effectPlayers = new Map<EffectName, PlayerLike>();
  private backgrounded = false;
  private _lastError: string | null = null;
  private disposed = false;

  constructor(
    private readonly backend: AudioBackend,
    private readonly sources: { ambients: Record<AmbientName, unknown>; effects: Record<EffectName, unknown> },
    prefs: AudioPrefs,
  ) {
    this.prefs = prefs;
    void this.applyMode();
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get currentScene(): Scene {
    return this.scene;
  }

  private get silent(): boolean {
    return this.prefs.muted || this.prefs.discreet || this.disposed;
  }

  private guard<T>(label: string, fn: () => T): T | undefined {
    try {
      return fn();
    } catch (e) {
      this._lastError = `${label} : ${e instanceof Error ? e.message : String(e)}`;
      return undefined;
    }
  }

  private async applyMode(): Promise<void> {
    try {
      await this.backend.setMode({ playsInSilentMode: this.prefs.playInSilentMode });
    } catch (e) {
      this._lastError = `Configuration audio : ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private ambient(name: AmbientName): PlayerLike | undefined {
    let p = this.ambientPlayers.get(name);
    if (!p) {
      p = this.guard(`Chargement de l’ambiance ${name}`, () => this.backend.createPlayer(this.sources.ambients[name]));
      if (!p) return undefined;
      p.loop = true;
      this.ambientPlayers.set(name, p);
    }
    return p;
  }

  private refreshAmbient(): void {
    for (const [name, p] of this.ambientPlayers) {
      if (name !== this.scene || this.silent || this.backgrounded || this.prefs.ambientVolume === 0) {
        this.guard('Pause de l’ambiance', () => p.pause());
      }
    }
    if (this.scene === 'none' || this.silent || this.backgrounded || this.prefs.ambientVolume === 0) return;
    const p = this.ambient(this.scene);
    if (!p) return;
    this.guard('Lecture de l’ambiance', () => {
      p.volume = this.prefs.ambientVolume;
      p.play();
    });
  }

  setScene(scene: Scene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.refreshAmbient();
  }

  playEffect(name: EffectName): void {
    if (this.silent || this.backgrounded || this.prefs.effectsVolume === 0) return;
    let p = this.effectPlayers.get(name);
    if (!p) {
      p = this.guard(`Chargement de l’effet ${name}`, () => this.backend.createPlayer(this.sources.effects[name]));
      if (!p) return;
      this.effectPlayers.set(name, p);
    }
    const player = p;
    this.guard('Lecture de l’effet', () => {
      player.volume = this.prefs.effectsVolume;
      void player.seekTo(0).catch((e: unknown) => {
        this._lastError = `Lecture de l’effet : ${e instanceof Error ? e.message : String(e)}`;
      });
      player.play();
    });
  }

  narrate(text: string): void {
    if (this.silent || this.backgrounded || !this.prefs.narrationEnabled || this.prefs.narrationVolume === 0) return;
    this.guard('Narration', () => {
      this.backend.stopSpeech();
      this.backend.speak(text, this.prefs.narrationVolume);
    });
  }

  updatePrefs(prefs: AudioPrefs): void {
    const modeChanged = prefs.playInSilentMode !== this.prefs.playInSilentMode;
    this.prefs = prefs;
    if (modeChanged) void this.applyMode();
    if (this.silent) this.guard('Arrêt de la narration', () => this.backend.stopSpeech());
    for (const p of this.effectPlayers.values()) this.guard('Volume', () => (p.volume = prefs.effectsVolume));
    this.refreshAmbient();
  }

  setBackgrounded(bg: boolean): void {
    if (bg === this.backgrounded) return;
    this.backgrounded = bg;
    if (bg) {
      this.guard('Arrêt de la narration', () => this.backend.stopSpeech());
      for (const p of this.effectPlayers.values()) this.guard('Pause', () => p.pause());
    }
    this.refreshAmbient();
  }

  dispose(): void {
    this.disposed = true;
    for (const p of [...this.ambientPlayers.values(), ...this.effectPlayers.values()]) {
      this.guard('Libération', () => {
        p.pause();
        p.remove();
      });
    }
    this.ambientPlayers.clear();
    this.effectPlayers.clear();
    this.guard('Arrêt de la narration', () => this.backend.stopSpeech());
  }
}
