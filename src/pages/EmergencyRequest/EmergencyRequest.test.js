import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { BLOOD_GROUPS } from '../../constants/bloodGroups.js';
import { validate } from './validate.js';

describe('Issue #13 - Explicit Blood-Group Selection on Emergency Request', () => {
  let viteServer;
  let EmergencyRequest;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    const mod = await viteServer.ssrLoadModule('./src/pages/EmergencyRequest/index.jsx');
    EmergencyRequest = mod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  describe('Requirement 5 & Shared Constant: BLOOD_GROUPS', () => {
    it('defines exactly the eight standard blood groups', () => {
      assert.deepEqual(BLOOD_GROUPS, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
      assert.equal(BLOOD_GROUPS.length, 8);
    });
  });

  describe('Requirements 3 & 4: Validation logic (validate)', () => {
    it('Requirement 3: requires blood group when empty or not selected', () => {
      const errors = validate({ hospital: 'City Hospital', patient: 'P-123', blood: '', area: 'Central' });
      assert.equal(errors.blood, 'Blood group is required.');
    });

    it('Requirement 3: requires blood group when missing, null, or undefined', () => {
      assert.equal(validate({ hospital: 'H', patient: 'P', area: 'A' }).blood, 'Blood group is required.');
      assert.equal(validate({ hospital: 'H', patient: 'P', area: 'A', blood: null }).blood, 'Blood group is required.');
      assert.equal(validate({ hospital: 'H', patient: 'P', area: 'A', blood: undefined }).blood, 'Blood group is required.');
    });

    it('Requirement 4: selecting any valid blood group removes the blood error', () => {
      // Simulate form with initial blood error
      const initialForm = { hospital: 'City Hospital', patient: 'P-123', blood: '', area: 'Central' };
      const initialErrors = validate(initialForm);
      assert.equal(initialErrors.blood, 'Blood group is required.');

      // Selecting any of the eight blood groups resolves the error
      for (const group of BLOOD_GROUPS) {
        const updatedForm = { ...initialForm, blood: group };
        const updatedErrors = validate(updatedForm);
        assert.equal(updatedErrors.blood, undefined, `Expected blood error to be removed when ${group} is selected`);
      }
    });

    it('Requirement 5: all eight blood groups pass validation', () => {
      for (const group of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) {
        const errors = validate({ hospital: 'City Hospital', patient: 'P-123', blood: group, area: 'Central' });
        assert.equal(errors.blood, undefined);
      }
    });
  });

  describe('Requirements 1, 2, 6: EmergencyRequest Component Rendering', () => {
    it('Requirement 1: blood group is empty by default (O Negative is not preselected)', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(EmergencyRequest))
      );

      // Verify the dropdown starts with the disabled empty placeholder selected, not O Negative
      assert.match(html, /<option value="" disabled="" selected="">Select blood group<\/option>/);
      assert.doesNotMatch(html, /<option value="O-"[^>]*selected/);
      assert.doesNotMatch(html, />O NEGATIVE</);
    });

    it('Requirement 2: "Select blood group" placeholder is displayed and disabled', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(EmergencyRequest))
      );

      assert.match(html, /<option value="" disabled=""[^>]*>Select blood group<\/option>/);
    });

    it('Requirement 5: all eight blood groups are rendered as selectable options', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(EmergencyRequest))
      );

      for (const group of BLOOD_GROUPS) {
        assert.ok(
          html.includes(`<option value="${group}"`),
          `Option for blood group ${group} should be present in the dropdown`
        );
      }
    });

    it('Requirement 6: preview card displays "—" when no blood group is selected', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(EmergencyRequest))
      );

      assert.ok(html.includes('>PRODUCT TYPE</div>'));
      assert.match(html, /PRODUCT TYPE<\/div><div[^>]*>—<\/div>/);
    });

    it('Requirement 5 & 6: preview card displays each selected blood group accurately', () => {
      for (const group of BLOOD_GROUPS) {
        const html = renderToStaticMarkup(
          React.createElement(
            MemoryRouter,
            null,
            React.createElement(EmergencyRequest, { initialValues: { blood: group } })
          )
        );
        assert.ok(
          html.includes(`>${group}</div>`),
          `Preview card should display ${group} when ${group} is selected`
        );
      }
    });

    it('Requirement 3: displays "Blood group is required." error message and error styling when error exists', () => {
      const htmlWithError = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(EmergencyRequest, { initialErrors: { blood: 'Blood group is required.' } })
        )
      );

      // Verify error text is rendered in the component
      assert.ok(htmlWithError.includes('Blood group is required.'));

      // Verify red border error styling (#FCA5A5) on select
      assert.ok(htmlWithError.includes('border:1px solid #FCA5A5'));
    });
  });
});
