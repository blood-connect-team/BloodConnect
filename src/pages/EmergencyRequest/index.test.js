import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let server;
let dom;
let EmergencyRequest;
let Landing;
let createRoot;
let MemoryRouter;
let requestService;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import('react-dom/client'));
  ({ MemoryRouter } = await import('react-router-dom'));
  server = await createServer({
    configFile: false,
    envDir: false,
    plugins: [react()],
    server: { middlewareMode: true, watch: null },
  });
  EmergencyRequest = (await server.ssrLoadModule('/src/pages/EmergencyRequest/index.jsx')).default;
  Landing = (await server.ssrLoadModule('/src/pages/Landing/index.jsx')).default;
  ({ requestService } = await server.ssrLoadModule('/src/services/requestService.js'));
});

after(async () => {
  await server?.close();
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

async function render(Component, check) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(() => root.render(createElement(MemoryRouter, null, createElement(Component))));
    await check(container);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
}

test('urgency starts neutral, is required and follows every explicit selection', async () => {
  await render(EmergencyRequest, async container => {
    const badge = container.querySelector('[role="status"][aria-label="Request urgency"]');
    assert.ok(badge, 'the preview exposes its urgency status');
    assert.equal(badge.textContent, 'Select urgency');
    assert.equal(container.querySelectorAll('[aria-pressed="true"]').length, 0);
    await act(() => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.match(container.textContent, /Select an urgency level\./);
    for (const label of ['High', 'Medium', 'Critical', 'High']) {
      const button = [...container.querySelectorAll('button')].find(el => el.textContent.trim() === label);
      await act(() => button.click());
      assert.equal(badge.textContent, label);
      assert.equal(button.getAttribute('aria-pressed'), 'true');
      assert.equal(container.querySelectorAll('[aria-pressed="true"]').length, 1);
      assert.doesNotMatch(container.textContent, /Select an urgency level\./);
    }
    assert.doesNotMatch(container.textContent, /Units (Remaining|Required)|SLA Target|Minutes|dispatch center|lock inv(?:entory)|milliseconds/);
  });
});

test('submission requires explicit urgency and sends the selected value', async () => {
  const original = requestService.createRequest;
  const requests = [];
  // Keep submission pending after capture so no donor lookup, email or redirect runs.
  requestService.createRequest = payload => {
    requests.push(payload);
    return new Promise(() => {});
  };
  try {
    await render(EmergencyRequest, async container => {
      for (const [id, value] of [['er-hospital', 'Test Hospital'], ['er-patient', 'Synthetic Patient'], ['er-area', 'Gulshan Karachi']]) {
        const input = container.querySelector(`#${id}`);
        await act(() => {
          Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
          input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        });
      }
      const submit = () => container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
      await act(submit);
      assert.equal(requests.length, 0);
      assert.match(container.textContent, /Select an urgency level\./);
      const high = [...container.querySelectorAll('button')].find(el => el.textContent.trim() === 'High');
      await act(() => high.click());
      await act(submit);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].urgency, 'high');
      assert.equal(requests[0].bloodGroup, 'O-');
    });
  } finally {
    requestService.createRequest = original;
  }
});

test('landing describes Karachi coverage without invented activity or medical guarantees', async () => {
  await render(Landing, async container => {
    assert.match(container.textContent, /Karachi only/);
    assert.match(container.textContent, /does not guarantee medical suitability/);
    assert.match(container.textContent, /confirm compatibility and donation eligibility/);
    assert.doesNotMatch(container.textContent, /25[,]430|42[,]000|1,890|Smart A[I]|Weekly Donations|New Alert|CRITICAL|milliseconds|geo-fencing|Global Health Tower/);
  });
});
