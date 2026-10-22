import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatJumlah, formatTanggal, formatWaktuLalu, getDurasiSimpanInfo } from '../js/utils/format.js';

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
});
