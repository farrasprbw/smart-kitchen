import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatJumlah, formatTanggal, formatWaktuLalu } from '../js/utils/format.js';

describe('Format & Sanitization Utilities', () => {
  describe('escapeHtml', () => {
    test('returns empty string for null or undefined', () => {
      assert.equal(escapeHtml(null), '');
      assert.equal(escapeHtml(undefined), '');
    });

    test('escapes HTML special characters correctly', () => {
      const input = '<script>alert("XSS & dangerous")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; dangerous&quot;)&lt;/script&gt;';
      assert.equal(escapeHtml(input), expected);
    });

    test('escapes single quotes for HTML attributes', () => {
      const input = "' onmouseover='alert(1)";
      const expected = "&#039; onmouseover=&#039;alert(1)";
      assert.equal(escapeHtml(input), expected);
    });

    test('converts numbers to safe string', () => {
      assert.equal(escapeHtml(12345), '12345');
    });
  });

  describe('formatJumlah', () => {
    test('handles valid numbers and units', () => {
      assert.equal(formatJumlah(2, 'kg'), '2 kg');
      assert.equal(formatJumlah(500, 'gram'), '500 gram');
      assert.equal(formatJumlah(3), '3');
    });

    test('handles null, undefined, or NaN safely', () => {
      assert.equal(formatJumlah(null, 'butir'), '? butir');
      assert.equal(formatJumlah(undefined, 'kg'), '? kg');
      assert.equal(formatJumlah(NaN, 'ikat'), '? ikat');
    });
  });

  describe('formatTanggal', () => {
    test('returns dash for null or undefined date', () => {
      assert.equal(formatTanggal(null), '-');
      assert.equal(formatTanggal(''), '-');
    });

    test('formats valid date string to Indonesian locale', () => {
      const formatted = formatTanggal('2026-10-22');
      assert.match(formatted, /22.*2026/);
    });
  });

  describe('formatWaktuLalu', () => {
    test('returns empty string for invalid date', () => {
      assert.equal(formatWaktuLalu('invalid-date'), '');
      assert.equal(formatWaktuLalu(null), '');
    });

    test('formats recent timestamp as baru saja', () => {
      const now = new Date().toISOString();
      assert.equal(formatWaktuLalu(now), 'baru saja');
    });
  });
});
