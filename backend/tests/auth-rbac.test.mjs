import assert from 'node:assert/strict';
import test from 'node:test';
import { ROLES } from '../constants/roles.js';
import { requireRoles } from '../middleware/authMiddleware.js';
import { hashToken, signAccessToken, verifyAccessToken } from '../services/tokenService.js';

test('token service signs and verifies access token', () => {
  const user = { _id: '507f1f77bcf86cd799439011', role: ROLES.COMMUTER, accountStatus: 'active' };
  const token = signAccessToken(user);
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, String(user._id));
  assert.equal(payload.role, ROLES.COMMUTER);
});

test('token hashing is deterministic', () => {
  const one = hashToken('abc');
  const two = hashToken('abc');
  const three = hashToken('xyz');
  assert.equal(one, two);
  assert.notEqual(one, three);
});

test('requireRoles blocks disallowed role', () => {
  const middleware = requireRoles(ROLES.SYSTEM_ADMIN);
  const req = { user: { role: ROLES.COMMUTER } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
  let called = false;
  middleware(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});
