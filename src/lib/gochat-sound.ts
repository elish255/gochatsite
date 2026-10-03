export function playSound(kind: "send" | "notice" = "notice") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextType = window.AudioContext;
    const context = new AudioContextType();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "send" ? 620 : 780, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "send" ? 850 : 1040, context.currentTime + 0.11);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => void context.close();
  } catch { /* Sound may be unavailable in the browser. */ }
}