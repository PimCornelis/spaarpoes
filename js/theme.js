// The look: the only place where colours and fonts are defined. This is the pastel skin.
// A second skin means a second version of this file.

export const colors = {
  // page
  bg: '#fff5f8',
  surface: '#ffffff',
  ink: '#4b3149',
  inkSoft: '#7a5c76',
  line: '#f3d8e4',
  accent: '#b4376c',
  accentInk: '#ffffff',
  accentSoft: '#ffe3ee',
  shade: 'rgba(75, 49, 73, 0.45)',

  // balance pills: green above zero, neutral at zero, red only below zero
  positive: '#d8f3e2',
  positiveInk: '#1c6641',
  zero: '#eeeaee',
  zeroInk: '#5f5261',
  negative: '#ffd9dc',
  negativeInk: '#9a1f34',

  // notice cards
  notice: '#fff3d1',
  noticeInk: '#6a4c05',

  // one soft colour per pot
  potRose: '#ffd6e5',
  potPeach: '#ffe0cc',
  potLemon: '#fff2b8',
  potMint: '#d3f1e3',
  potSky: '#d5eaff',
  potLilac: '#e8dcff',

  // chart bars and lines: darker than the pastels, so they can be read
  chartMain: '#b4376c',
  chartSecond: '#4f86c6',
  chartGrid: '#efdde6',

  // the kitten
  fur: '#ffdcc4',
  furShade: '#f6b98f',
  furLight: '#fff3e9',
  outline: '#6d4350',
  innerEar: '#ffafc6',
  nose: '#ee7d9d',
  cheek: '#ff9db6',
  collar: '#a98ee0',
  bell: '#ffd45e',
  cushion: '#cfe6ff',
  tear: '#9fd3f5',

  // confetti
  confetti1: '#ff8fb5',
  confetti2: '#ffd45e',
  confetti3: '#7fd6b0',
  confetti4: '#8cc4ff',
  confetti5: '#b79cf0',
};

export const POT_COLORS = {
  rose: 'potRose',
  peach: 'potPeach',
  lemon: 'potLemon',
  mint: 'potMint',
  sky: 'potSky',
  lilac: 'potLilac',
};

// Fonts that are already on the phone. Nothing is loaded from the internet.
export const fonts = {
  body: 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

/** "potRose" -> "--color-pot-rose", "confetti1" -> "--color-confetti1" */
export function cssName(key) {
  return `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** All colours and fonts as CSS variables, as [name, value] pairs. */
export function themeVariables() {
  return [
    ...Object.entries(colors).map(([key, value]) => [cssName(key), value]),
    ['--font-body', fonts.body],
  ];
}

/** The colour of a pot as a CSS value. */
export function potColor(token) {
  return `var(${cssName(POT_COLORS[token] ?? POT_COLORS.rose)})`;
}

export function applyTheme(doc) {
  for (const [name, value] of themeVariables()) doc.documentElement.style.setProperty(name, value);
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'theme-color';
    doc.head.append(meta);
  }
  meta.content = colors.bg;
}
