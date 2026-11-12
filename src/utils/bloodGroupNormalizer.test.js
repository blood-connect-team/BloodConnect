// Unit tests for the blood-group normalizer.
// Runner: Node's built-in test runner (`npm test`), so no extra dependency is needed.
// When component tests are introduced (ISSUE-21), these can move to Vitest unchanged in spirit.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBloodGroup } from './bloodGroupNormalizer.js';

describe('normalizeBloodGroup', () => {
  it('maps every Emergency Request dropdown label to its short form', () => {
    const cases = {
      'O Negative (Emergency Universal)': 'O-',
      'O Positive': 'O+',
      'A Positive': 'A+',
      'A Negative': 'A-',
      'B Positive': 'B+',
      'B Negative': 'B-',
      'AB Positive': 'AB+',
      'AB Negative': 'AB-',
    };
    for (const [input, expected] of Object.entries(cases)) {
      assert.equal(normalizeBloodGroup(input), expected, `input: ${input}`);
    }
  });

  it('keeps the short forms used by the registration form unchanged', () => {
    for (const group of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
      assert.equal(normalizeBloodGroup(group), group);
    }
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    assert.equal(normalizeBloodGroup('  ab+ '), 'AB+');
    assert.equal(normalizeBloodGroup('o negative'), 'O-');
  });

  it('returns an empty string for missing input', () => {
    assert.equal(normalizeBloodGroup(''), '');
    assert.equal(normalizeBloodGroup(null), '');
    assert.equal(normalizeBloodGroup(undefined), '');
  });
});
