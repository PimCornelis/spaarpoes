// Where each piece of confetti starts, how it falls and which colour it has. No screen code here, so
// the preview page can use the same list. The spread looks random but is the same every time.

const COLOURS = 5;

const spread = (n, step, size) => (n * step) % size;

export function confettiPieces(count = 42) {
  return Array.from({ length: count }, (_, i) => ({
    '--x': `${spread(i, 37, 100)}%`,
    '--delay': `${-spread(i, 13, 30) / 10}s`,
    '--time': `${2.4 + spread(i, 7, 12) / 10}s`,
    '--spin': `${120 + spread(i, 71, 480)}deg`,
    '--drift': `${spread(i, 29, 61) - 30}px`,
    '--rest': `${spread(i, 53, 90) + 3}%`,
    '--paper': `var(--color-confetti${(i % COLOURS) + 1})`,
  }));
}
