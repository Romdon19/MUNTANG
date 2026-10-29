import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS } from '../src/richmenu.js';

test('rich menu layouts tile the whole image without overlap', () => {
  for (const [name, L] of Object.entries(LAYOUTS)) {
    const areas = L.areas((label, view) => ({ type: 'uri', label, uri: `x?view=${view}` }));
    const covered = areas.reduce((a, { bounds: b }) => a + b.width * b.height, 0);
    assert.equal(covered, L.size.width * L.size.height, name);
    for (const { bounds: b } of areas) assert.ok(b.x + b.width <= L.size.width && b.y + b.height <= L.size.height, name);
  }
});
