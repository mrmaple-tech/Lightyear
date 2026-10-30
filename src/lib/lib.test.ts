// Run: npm test
import assert from 'node:assert/strict';
import { HelioVector, Body } from 'astronomy-engine';
import { eqjToScene, earthBasis, fade, AU, LY, MPC } from './coords.ts';
import { scaleBar, lightTime, niceFloor } from './scale.ts';
import { Vector3 } from 'three';
import { addTles } from './satellites.ts';
import { passes } from './passes.ts';

// Scale bar picks round numbers and the right unit at each scale.
assert.equal(niceFloor(730), 500);
assert.equal(scaleBar(1000).label, '100 km');
assert.match(scaleBar((2 * AU) / 120).label, /^2 AU$/);
assert.match(scaleBar((4 * LY) / 120).label, /^2 ly$/);
assert.match(scaleBar((300 * MPC) / 120).label, /^200 Mpc$/);
assert.ok(scaleBar(1234).px <= 120);
assert.equal(lightTime(AU), '8.3 light-minutes');
assert.equal(lightTime(411e3), '1.4 light-milliseconds'); // ISS altitude

// Fade windows.
assert.equal(fade(5, [0, 1, 8, 9]), 1);
assert.equal(fade(9.5, [0, 1, 8, 9]), 0);
assert.equal(fade(-50, [-Infinity, -Infinity, 8, 9]), 1);

// Ecliptic lies in the XZ plane: Earth's heliocentric position has ~zero Y.
const t = new Date('2026-03-20T12:00:00Z');
const e = HelioVector(Body.Earth, t);
const earth = eqjToScene(e.x, e.y, e.z);
assert.ok(Math.abs(earth.y) < 1e-4, `earth y ${earth.y}`);

// Near the March equinox at 12:00 UTC the Sun is overhead near longitude 0, latitude 0.
const sunDir = earth.clone().negate().normalize();
const lon0 = new Vector3().setFromMatrixColumn(earthBasis(t), 0);
assert.ok(sunDir.dot(lon0) > 0.99, `subsolar dot ${sunDir.dot(lon0)}`);
// …and 6 hours later it is over 90°W, i.e. opposite local +Z's negation (lon90E = -Z).
const t2 = new Date('2026-03-20T18:00:00Z');
const lon90E = new Vector3().setFromMatrixColumn(earthBasis(t2), 2).negate();
assert.ok(sunDir.dot(lon90E) < -0.99, `90E dot ${sunDir.dot(lon90E)}`);

// Pass prediction: a 2019 ISS orbit over New York, and a synthetic geostationary orbit.
addTles('1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992\n2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442');
addTles('1 99999U 19001A   19156.50000000  .00000000  00000-0  00000-0 0  9990\n2 99999   0.0100 000.0000 0001000 000.0000 000.0000  1.00270000    10');
const from = new Date('2019-06-05T12:00:00Z');
const iss = passes(25544, 40.7, -74.0, from);
assert.ok('passes' in iss && iss.passes.length === 5);
for (const p of iss.passes) {
  const min = (+p.set - +p.rise) / 6e4;
  assert.ok(min > 1 && min < 13 && p.maxEl >= 10 && p.maxEl <= 90, `pass ${min} min, ${p.maxEl}°`);
}
assert.ok(iss.passes.some((p) => p.visible)); // a dusk pass that evening
const geo = passes(99999, 40.7, -74.0, from);
assert.ok('always' in geo && Math.abs(geo.always - 43) < 2 && geo.dir === 'S');
assert.ok('never' in passes(99999, -33.9, 151.2, from));

console.log('ok');
