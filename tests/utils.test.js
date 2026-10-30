import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatJumlah, formatTanggal, formatWaktuLalu, getDurasiSimpanInfo, scaleTakaran } from '../js/utils/format.js';

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
  });

  describe('getDurasiSimpanInfo', () => {
    test('handles missing or invalid date safely', () => {
      const info = getDurasiSimpanInfo(null);
      assert.equal(info.text, 'Hari ini');
      assert.equal(info.days, 0);
      assert.equal(info.isPrioritas, false);
    });

    test('returns Hari ini for newly added items', () => {
      const now = new Date().toISOString();
      const info = getDurasiSimpanInfo(now, 'sayur');
      assert.equal(info.text, 'Hari ini');
      assert.equal(info.days, 0);
      assert.equal(info.isPrioritas, false);
    });

    test('identifies fresh ingredients stored for 3+ days as priority', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
      const info = getDurasiSimpanInfo(fourDaysAgo, 'sayur');
      assert.equal(info.days, 4);
      assert.equal(info.isPrioritas, true);
      assert.match(info.text, /4 hari.*Prioritas masak/);
    });

    test('keeps dry/spice ingredients non-priority even after 4 days', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
      const info = getDurasiSimpanInfo(fourDaysAgo, 'bumbu');
      assert.equal(info.days, 4);
      assert.equal(info.isPrioritas, false);
    });
  });

  describe('scaleTakaran (Portion Adjustment)', () => {
    test('scales whole numbers and preserves notes', () => {
      assert.equal(scaleTakaran('3 buah (haluskan)', 4), '12 buah (haluskan)');
      assert.equal(scaleTakaran('2 buah (iris tipis)', 6), '12 buah (iris tipis)');
      assert.equal(scaleTakaran('3 sdm', 6), '18 sdm');
      assert.equal(scaleTakaran('200 ml', 6), '1200 ml');
    });

    test('scales fractions properly into culinary measures', () => {
      assert.equal(scaleTakaran('1/2 sdt', 6), '3 sdt');
      assert.equal(scaleTakaran('½ sdt', 6), '3 sdt');
      assert.equal(scaleTakaran('1/2 sdt garam', 0.5), '1/4 sdt garam');
      assert.equal(scaleTakaran('1 sdm', 1.5), '1 1/2 sdm');
      assert.equal(scaleTakaran('1 1/2 sdm', 2), '3 sdm');
    });

    test('scales ranges accurately', () => {
      assert.equal(scaleTakaran('2-3 siung', 3), '6-9 siung');
    });

    test('keeps non-quantifiable terms untouched', () => {
      assert.equal(scaleTakaran('Secukupnya', 5), 'Secukupnya');
      assert.equal(scaleTakaran('Sejumput garam', 2), 'Sejumput garam');
      assert.equal(scaleTakaran('', 2), 'Secukupnya');
    });
  });
});
