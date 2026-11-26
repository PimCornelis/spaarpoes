// A short, soft chime for a party. Made by the phone itself, so there is no sound file.
// Silent unless "Geluidjes" is switched on in the settings. There is no vibration anywhere.

let audio = null;

/** Must be called from a tap: phones only allow sound that starts with one. */
export function armSound() {
  audio ??= new AudioContext();
  if (audio.state !== 'running') audio.resume();
}

const NOTES = [659.25, 783.99, 987.77, 1318.51]; // E, G, B, E

export function chime() {
  if (!audio) return;
  NOTES.forEach((frequency, i) => {
    const start = audio.currentTime + i * 0.11;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    tone.connect(volume).connect(audio.destination);
    tone.start(start);
    tone.stop(start + 0.45);
  });
}
