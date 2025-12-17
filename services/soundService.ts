// A simple synthesizer to avoid external assets
const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  if (ctx.state === 'suspended') ctx.resume();
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
};

export const playSound = {
  select: () => playTone(800, 'square', 0.1, 0.05),
  confirm: () => playTone(1200, 'square', 0.15, 0.05),
  error: () => playTone(150, 'sawtooth', 0.3, 0.1),
  levelUp: () => {
    playTone(440, 'sine', 0.1);
    setTimeout(() => playTone(554, 'sine', 0.1), 100);
    setTimeout(() => playTone(659, 'sine', 0.2), 200);
  },
  legendary: () => {
    playTone(300, 'square', 0.1);
    setTimeout(() => playTone(600, 'square', 0.1), 100);
    setTimeout(() => playTone(900, 'square', 0.4), 200);
  },
  event: () => {
    playTone(200, 'triangle', 0.5);
  }
};