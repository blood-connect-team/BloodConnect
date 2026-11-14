import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { BLOOD_GROUPS } from '../../constants/bloodGroups.js';

describe('Register Form Compatibility with Shared BLOOD_GROUPS', () => {
  let viteServer;
  let Register;

  before(async () => {
    viteServer = await createServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    const mod = await viteServer.ssrLoadModule('./src/pages/Register/index.jsx');
    Register = mod.default;
  });

  after(async () => {
    if (viteServer) {
      await viteServer.close();
    }
  });

  it('renders the registration form with disabled "Select Group" placeholder', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(Register))
    );

    assert.ok(html.includes('<option value="" disabled=""'), 'Should have disabled placeholder option');
    assert.ok(html.includes('Select Group'), 'Should display "Select Group" placeholder text');
  });

  it('renders all eight blood groups from the shared constant in Register form', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(Register))
    );

    for (const group of BLOOD_GROUPS) {
      assert.ok(
        html.includes(`<option value="${group}">${group}</option>`),
        `Register form should render option for ${group}`
      );
    }
  });
});

