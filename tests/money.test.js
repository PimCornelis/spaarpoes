import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, formatEuro, formatDecimal, roundDiv } from '../js/core/money.js';

// Intl puts a "no-break space" between the euro sign and the number.
const plain = (text) => text.replace(/ /g, ' ');

test('shows cents the Dutch way', () => {
  assert.equal(plain(formatEuro(123456)), '€ 1.234,56');
  assert.equal(plain(formatEuro(5)), '€ 0,05');
  assert.equal(plain(formatEuro(0)), '€ 0,00');
  assert.equal(plain(formatEuro(-1250)), '€ -12,50');
});

test('formatting refuses anything that is not whole cents', () => {
  assert.throws(() => formatEuro(12.5));
  assert.throws(() => formatEuro(NaN));
  assert.throws(() => formatEuro('100'));
});

test('writes a plain decimal number for the CSV file', () => {
  assert.equal(formatDecimal(123456), '1234,56');
  assert.equal(formatDecimal(-5), '-0,05');
  assert.equal(formatDecimal(0), '0,00');
});

test('reads typed amounts with a comma or a dot', () => {
  assert.equal(parseAmount('12'), 1200);
  assert.equal(parseAmount('12,5'), 1250);
  assert.equal(parseAmount('12,50'), 1250);
  assert.equal(parseAmount('12.50'), 1250);
  assert.equal(parseAmount('0,05'), 5);
  assert.equal(parseAmount(',5'), 50);
  assert.equal(parseAmount(' € 7,00 '), 700);
});

test('reads Dutch thousands separators', () => {
  assert.equal(parseAmount('1.234,56'), 123456);
  assert.equal(parseAmount('1.234'), 123400);
  assert.equal(parseAmount('12.345.678'), 1234567800);
});

test('amounts that float arithmetic would get wrong stay exact', () => {
  assert.equal(parseAmount('0,29'), 29);
  assert.equal(parseAmount('1,13'), 113);
  assert.equal(parseAmount('4503,61'), 450361);
});

test('refuses unclear or impossible amounts', () => {
  for (const bad of ['', ' ', 'abc', '-5', '5-', '1,234', '1,2,3', '1.23.4', '12.3456', '12,', '.', ',', '1e3', '10000000000']) {
    assert.equal(parseAmount(bad), null, `"${bad}" should be refused`);
  }
});

test('rounded division of whole cents', () => {
  assert.equal(roundDiv(100, 3), 33);
  assert.equal(roundDiv(200, 3), 67);
  assert.equal(roundDiv(5, 2), 3);
  assert.equal(roundDiv(0, 12), 0);
});
