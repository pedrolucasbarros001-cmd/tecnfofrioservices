import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'notification-sound-enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  // Two-tone chime (ding-dong style)
  const tones = [
    { freq: 880, start: 0, dur: 0.18 },
    { freq: 660, start: 0.16, dur: 0.22 },
  ];

  tones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  });

  master.gain.setValueAtTime(1, now);
}

export function useNotificationSound() {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Keep state in sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSoundEnabledState(e.newValue === null ? true : e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setSoundEnabled = useCallback((value: boolean) => {
    setSoundEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
    if (value) {
      // Prime AudioContext on user gesture (iOS/Safari requirement)
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  }, []);

  return { soundEnabled, setSoundEnabled, playNotificationSound };
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}
