// Simple Web Audio API Synthesizer for Retro SFX

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playOscillator = (type: OscillatorType, freq: number, duration: number, vol: number = 0.1) => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio error", e);
  }
};

export const playSound = {
  menuSelect: () => playOscillator('square', 440, 0.1),
  menuMove: () => playOscillator('sine', 220, 0.05, 0.05),
  damage: () => {
    // Noise burst simulation
    playOscillator('sawtooth', 100, 0.1, 0.2);
    setTimeout(() => playOscillator('sawtooth', 80, 0.1, 0.2), 50);
  },
  attack: () => {
    // Swipe sound
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },
  heal: () => {
    playOscillator('sine', 440, 0.1);
    setTimeout(() => playOscillator('sine', 660, 0.2), 100);
  },
  buy: () => {
    // Coin sound (high pitch ping)
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    
    // Second ping for "cha-ching" effect
    setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2000, ctx.currentTime);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
    }, 100);
  },
  victory: () => {
    playOscillator('square', 523.25, 0.1); // C
    setTimeout(() => playOscillator('square', 659.25, 0.1), 150); // E
    setTimeout(() => playOscillator('square', 783.99, 0.1), 300); // G
    setTimeout(() => playOscillator('square', 1046.50, 0.4), 450); // High C
  }
};