// Hand-drawn SVG charts: columns, horizontal bars and a line. Colours come from CSS classes.
// Every mark can be tapped (or reached with the keyboard) and reports which one it was. The values
// are also in a table under each chart, so nothing depends on seeing or tapping the drawing.

import { formatEuro } from '../core/money.js';
import { s } from './dom.js';

const WIDTH = 340;
const LEFT = 40; // room for the amounts along the side
const RIGHT = 8;
const TOP = 18; // room for a value above the tallest column
const BOTTOM = 22; // room for the labels underneath
const MAX_BAR = 24;
const GAP = 2;
const CORNER = 4;

const wholeEuros = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });

/** A round step (1, 2 or 5 times a power of ten, in cents) giving about four gridlines. */
function niceStep(span) {
  const rough = Math.max(span / 4, 100);
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((n) => n * power).find((step) => step >= rough);
}

/** The scale from amounts to heights; zero is always on it. */
function scale(values, height) {
  const high = Math.max(0, ...values);
  const low = Math.min(0, ...values);
  const step = niceStep(high - low);
  const top = Math.max(Math.ceil(high / step) * step, step);
  const bottom = Math.floor(low / step) * step;
  const ticks = [];
  for (let value = bottom; value <= top; value += step) ticks.push(value);
  const y = (value) => TOP + ((top - value) / (top - bottom)) * height;
  return { y, ticks };
}

function frame(height, label, ticks, y) {
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${WIDTH} ${height}`, role: 'group', 'aria-label': label });
  for (const tick of ticks) {
    svg.append(
      s('line', { class: tick === 0 ? 'axis' : 'grid', x1: LEFT, x2: WIDTH - RIGHT, y1: y(tick), y2: y(tick) }),
      s('text', { class: 'tick', x: LEFT - 5, y: y(tick) + 3.5, 'text-anchor': 'end' }, wholeEuros.format(tick / 100)),
    );
  }
  return svg;
}

/** Makes a group tappable and keyboard-reachable, and marks it as the chosen one. */
function tappable(svg, group, description, onchoose) {
  const choose = () => {
    for (const other of svg.querySelectorAll('.mark')) other.classList.remove('is-chosen');
    group.classList.add('is-chosen');
    onchoose();
  };
  group.setAttribute('class', 'mark');
  group.setAttribute('role', 'button');
  group.setAttribute('tabindex', '0');
  group.setAttribute('aria-label', description);
  group.append(s('title', {}, description));
  group.addEventListener('click', choose);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose();
    }
  });
}

/** A column with rounded corners at the top and a square foot on the zero line. */
function column(x, top, width, foot, className) {
  const height = foot - top;
  const r = Math.min(CORNER, height, width / 2);
  const d = `M${x} ${foot}V${top + r}q0 ${-r} ${r} ${-r}h${width - 2 * r}q${r} 0 ${r} ${r}V${foot}Z`;
  return s('path', { class: className, d });
}

/** Shows every label when they fit, otherwise every second, third, ... counted from the last. */
function shownLabels(count, room) {
  const every = Math.ceil(count / room);
  return (i) => (count - 1 - i) % every === 0;
}

/**
 * Columns side by side. `series` is [{name, className, values}], one or two of them.
 * `onchoose(index)` is called when a slot is tapped. `max` can fix the scale across several charts.
 */
export function columnChart({ labels, series, title, onchoose, max = 0, height = 130 }) {
  const all = series.flatMap((one) => one.values);
  const { y, ticks } = scale([...all, max], height);
  const full = TOP + height + BOTTOM;
  const svg = frame(full, title, ticks, y);
  const slot = (WIDTH - LEFT - RIGHT) / labels.length;
  const width = Math.min(MAX_BAR, (slot * 0.8 - GAP * (series.length - 1)) / series.length);
  const labelled = shownLabels(labels.length, 7);
  const highest = Math.max(...all);

  labels.forEach((text, i) => {
    const middle = LEFT + slot * (i + 0.5);
    const start = middle - (series.length * width + GAP * (series.length - 1)) / 2;
    const group = s('g', {}, s('rect', { class: 'hit', x: LEFT + slot * i, y: 0, width: slot, height: full }));
    series.forEach((one, n) => {
      const value = one.values[i];
      if (value > 0) group.append(column(start + n * (width + GAP), y(value), width, y(0), one.className));
    });
    // Only the tallest column gets its amount written on it; the rest is in the table.
    const single = series.length === 1;
    if (single && highest > 0 && series[0].values[i] === highest && series[0].values.indexOf(highest) === i) {
      const anchor = middle < LEFT + 30 ? 'start' : middle > WIDTH - 40 ? 'end' : 'middle';
      group.append(s('text', { class: 'value', x: middle, y: y(highest) - 5, 'text-anchor': anchor }, formatEuro(highest)));
    }
    if (labelled(i)) group.append(s('text', { class: 'tick', x: middle, y: full - 7, 'text-anchor': 'middle' }, text));
    const said = series.map((one) => `${series.length > 1 ? `${one.name} ` : ''}${formatEuro(one.values[i])}`).join(', ');
    tappable(svg, group, `${text}: ${said}`, () => onchoose(i));
    svg.append(group);
  });
  return svg;
}

const ROW = 40;
const MAX_ROW_LABEL = 34;

/** Horizontal bars with the name above and the amount at the end. `rows` is [{label, value}]. */
export function barChart({ rows, title, onchoose }) {
  const highest = Math.max(1, ...rows.map((row) => row.value));
  const longest = 250; // leaves room for the amount behind the longest bar
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${WIDTH} ${rows.length * ROW}`, role: 'group', 'aria-label': title });
  rows.forEach((row, i) => {
    const top = i * ROW;
    const length = Math.max((row.value / highest) * longest, row.value > 0 ? 2 : 0);
    const name = row.label.length > MAX_ROW_LABEL ? `${row.label.slice(0, MAX_ROW_LABEL - 1)}…` : row.label;
    const r = Math.min(CORNER, length);
    const group = s('g', {},
      s('rect', { class: 'hit', x: 0, y: top, width: WIDTH, height: ROW }),
      s('text', { class: 'row-label', x: 2, y: top + 13 }, name),
      s('path', {
        class: 'bar',
        d: `M2 ${top + 19}h${length - r}q${r} 0 ${r} ${r}v${14 - 2 * r}q0 ${r} ${-r} ${r}H2Z`,
      }),
      s('text', { class: 'value', x: 2 + length + 6, y: top + 30 }, formatEuro(row.value)));
    tappable(svg, group, `${row.label}: ${formatEuro(row.value)}`, () => onchoose(i));
    svg.append(group);
  });
  return svg;
}

/** A line over time. `points` is [{label, short, value}]. */
export function lineChart({ points, title, onchoose, height = 140 }) {
  const { y, ticks } = scale(points.map((p) => p.value), height);
  const full = TOP + height + BOTTOM;
  const svg = frame(full, title, ticks, y);
  const inner = WIDTH - LEFT - RIGHT;
  const slot = inner / points.length;
  const x = (i) => LEFT + slot * (i + 0.5);
  const labelled = shownLabels(points.length, 6);
  svg.append(s('path', {
    class: 'line',
    d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.value)}`).join(''),
  }));
  points.forEach((point, i) => {
    const group = s('g', {},
      s('rect', { class: 'hit', x: LEFT + slot * i, y: 0, width: slot, height: full }),
      // With many points only the last keeps a dot; the chosen one gets its dot back.
      s('circle', {
        class: points.length <= 14 || i === points.length - 1 ? 'dot' : 'dot is-quiet',
        cx: x(i), cy: y(point.value), r: 4,
      }));
    if (i === points.length - 1) {
      const above = y(point.value) - 9;
      group.append(s('text', { class: 'value', x: x(i) + 4, y: above, 'text-anchor': 'end' }, formatEuro(point.value)));
    }
    if (labelled(i)) {
      const anchor = i === points.length - 1 ? 'end' : 'middle';
      group.append(s('text', {
        class: 'tick', x: anchor === 'end' ? WIDTH - 2 : x(i), y: full - 7, 'text-anchor': anchor,
      }, point.short));
    }
    tappable(svg, group, `${point.label}: ${formatEuro(point.value)}`, () => onchoose(i));
    svg.append(group);
  });
  return svg;
}
