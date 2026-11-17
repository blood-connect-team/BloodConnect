import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, whatsAppLink } from './phone.js';

describe('normalizePhone', () => {
  it('normalises common Pakistani formats to +92', () => {
    for (const input of ['03001234567', '0300-1234567', '0300 1234567', '3001234567', '+92 300 1234567', '923001234567', '00923001234567', '(0300) 123-4567']) {
      assert.deepEqual(normalizePhone(input), { e164: '+923001234567' }, input);
    }
  });

  it('keeps valid international numbers', () => {
    assert.deepEqual(normalizePhone('+44 20 7946 0958'), { e164: '+442079460958' });
  });

  it('rejects junk, empty input and non-mobile Pakistani numbers', () => {
    for (const input of ['', '   ', '-------', '12345', 'abc0300', '+92 21 1234567', null, undefined]) {
      assert.ok('error' in normalizePhone(input), String(input));
    }
  });
});

describe('whatsAppLink', () => {
  it('builds a digits-only wa.me link with encoded text', () => {
    assert.equal(whatsAppLink('0300-1234567', 'Hi there'), 'https://wa.me/923001234567?text=Hi%20there');
  });
  it('returns null instead of throwing for unusable numbers', () => {
    assert.equal(whatsAppLink(undefined), null);
    assert.equal(whatsAppLink('123'), null);
  });
});
