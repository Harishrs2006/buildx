/// <reference types="node" />
// Run with Node's built-in test runner via tsx (no extra test framework in the mobile app):
//   npx tsx --test apps/mobile/src/lib/deliveryAddress.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDeliveryAddress, type DeviceLocation } from './deliveryAddress';

const form = { label: 'Site', fullAddress: '  Plot 12, SIT Road  ', contactPhone: '9876500000' };

test('no location (GPS not used, permission denied, or unavailable) → no coordinates at all', () => {
  const address = buildDeliveryAddress(form, null);
  assert.deepEqual(address, { label: 'Site', fullAddress: 'Plot 12, SIT Road', contactPhone: '9876500000' });
  assert.equal('lat' in address, false);
  assert.equal('lng' in address, false);
  // The JSON actually sent to the API has no coordinate keys either
  assert.doesNotMatch(JSON.stringify({ deliveryAddress: address }), /"lat"|"lng"/);
});

test('a real device location is passed through unchanged', () => {
  const location: DeviceLocation = { source: 'device', lat: 12.9716, lng: 77.5946 };
  assert.deepEqual(buildDeliveryAddress(form, location), {
    label: 'Site', fullAddress: 'Plot 12, SIT Road', contactPhone: '9876500000', lat: 12.9716, lng: 77.5946,
  });
});

test('invalid or non-device positions are dropped, not replaced', () => {
  const bad = [
    { source: 'device', lat: Number.NaN, lng: 77.5 },
    { source: 'device', lat: 91, lng: 77.5 },
    { source: 'device', lat: 12.9, lng: Infinity },
    { source: 'default', lat: 13.34, lng: 77.1006 },
  ] as unknown as DeviceLocation[];
  for (const location of bad) {
    const address = buildDeliveryAddress(form, location);
    assert.equal('lat' in address, false, JSON.stringify(location));
    assert.equal('lng' in address, false, JSON.stringify(location));
  }
});

test('checkout screen contains no hardcoded coordinates', () => {
  const checkout = readFileSync(join(__dirname, '..', '..', 'app', '(buyer)', 'checkout.tsx'), 'utf8');
  assert.doesNotMatch(checkout, /\blat\s*:\s*-?\d/, 'checkout.tsx must not hardcode a latitude');
  assert.doesNotMatch(checkout, /\blng\s*:\s*-?\d/, 'checkout.tsx must not hardcode a longitude');
  assert.doesNotMatch(checkout, /13\.34|77\.10/, 'the old Tumakuru fallback must not come back');
});
