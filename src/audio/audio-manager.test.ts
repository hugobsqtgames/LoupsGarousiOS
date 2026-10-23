import { AudioManager, type AudioBackend, type AudioPrefs, type PlayerLike } from './audio-manager';

class FakePlayer implements PlayerLike {
  playing = false;
  volume = 1;
  loop = false;
  removed = false;
  seeks = 0;
  constructor(readonly source: unknown) {}
  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  async seekTo() {
    this.seeks += 1;
  }
  remove() {
    this.removed = true;
  }
}

function setup(over: Partial<AudioPrefs> = {}, opts: { failSource?: string } = {}) {
  const players: FakePlayer[] = [];
  const spoken: string[] = [];
  const modes: boolean[] = [];
  const backend: AudioBackend = {
    createPlayer(source) {
      if (source === opts.failSource) throw new Error('fichier absent');
      const p = new FakePlayer(source);
      players.push(p);
      return p;
    },
    async setMode({ playsInSilentMode }) {
      modes.push(playsInSilentMode);
    },
    speak: (t) => spoken.push(t),
    stopSpeech: () => undefined,
  };
  const prefs: AudioPrefs = { muted: false, discreet: false, ambientVolume: 0.5, effectsVolume: 0.7, narrationEnabled: true, narrationVolume: 0.8, playInSilentMode: false, ...over };
  const m = new AudioManager(backend, { ambients: { night: 'night', day: 'day', rain: 'rain', storm: 'storm' }, effects: { nightfall: 'nf', daybreak: 'db', confirm: 'c', vote: 'v', undo: 'u', alert: 'a', step: 's', victory: 'w', howl: 'h', bell: 'b', timer: 't' } }, prefs);
  return { m, players, spoken, modes, prefs };
}

describe('AudioManager', () => {
  it('une seule ambiance à la fois, en boucle, au bon volume', () => {
    const { m, players } = setup();
    m.setScene('night');
    m.setScene('day');
    const night = players.find((p) => p.source === 'night')!;
    const day = players.find((p) => p.source === 'day')!;
    expect(night.playing).toBe(false);
    expect(day.playing).toBe(true);
    expect(day.loop).toBe(true);
    expect(day.volume).toBe(0.5);
  });

  it('les effets réutilisent leur lecteur et repartent du début', () => {
    const { m, players } = setup();
    m.playEffect('vote');
    m.playEffect('vote');
    const vote = players.filter((p) => p.source === 'v');
    expect(vote).toHaveLength(1);
    expect(vote[0].seeks).toBe(2);
    expect(vote[0].volume).toBe(0.7);
  });

  it('sourdine et mode discret coupent tout', () => {
    const { m, players, spoken, prefs } = setup({ discreet: true });
    m.setScene('night');
    m.playEffect('confirm');
    m.narrate('La Voyante se réveille');
    expect(players.filter((p) => p.playing)).toHaveLength(0);
    expect(spoken).toEqual([]);
    m.updatePrefs({ ...prefs, discreet: false });
    expect(players.find((p) => p.source === 'night')?.playing).toBe(true);
    m.updatePrefs({ ...prefs, discreet: false, muted: true });
    expect(players.find((p) => p.source === 'night')?.playing).toBe(false);
  });

  it('les changements de volume s’appliquent immédiatement', () => {
    const { m, players, prefs } = setup();
    m.setScene('night');
    m.updatePrefs({ ...prefs, ambientVolume: 0.2 });
    expect(players[0].volume).toBe(0.2);
    m.updatePrefs({ ...prefs, ambientVolume: 0 });
    expect(players[0].playing).toBe(false);
  });

  it('se met en pause en arrière-plan puis reprend', () => {
    const { m, players } = setup();
    m.setScene('night');
    m.setBackgrounded(true);
    expect(players[0].playing).toBe(false);
    m.playEffect('confirm');
    expect(players).toHaveLength(1);
    m.setBackgrounded(false);
    expect(players[0].playing).toBe(true);
  });

  it('un son manquant n’interrompt pas l’application et l’erreur est exposée', () => {
    const { m } = setup({}, { failSource: 'night' });
    expect(() => m.setScene('night')).not.toThrow();
    expect(m.lastError).toMatch(/fichier absent/);
    expect(() => m.playEffect('confirm')).not.toThrow();
  });

  it('narration seulement si activée ; mode silencieux transmis', async () => {
    const { m, spoken, prefs, modes } = setup({ narrationEnabled: false });
    m.narrate('A');
    m.updatePrefs({ ...prefs, narrationEnabled: true, playInSilentMode: true });
    m.narrate('B');
    expect(spoken).toEqual(['B']);
    await Promise.resolve();
    expect(modes).toEqual([false, true]);
  });

  it('libère tous les lecteurs', () => {
    const { m, players } = setup();
    m.setScene('night');
    m.playEffect('vote');
    m.dispose();
    expect(players.every((p) => p.removed)).toBe(true);
  });
});

describe('ambiances supplémentaires', () => {
  it('passe de la pluie à l’orage sans superposer deux ambiances', () => {
    const { m, players } = setup();
    m.setScene('rain');
    m.setScene('storm');
    const playing = players.filter((p) => p.playing);
    expect(playing.map((p) => p.source)).toEqual(['storm']);
  });
});
