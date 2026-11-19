import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shouldUseSecureSessionCookie,
  signSessionPayload,
  verifySessionToken,
} from '../../../lib/server/auth-helpers';
import {
  hasResolvedPermission,
  hasRoleAtLeast,
  resolvePermissions,
} from '../../../lib/auth/permissions';

// GH-ISSUE: 19,45,48,173,202,204,206; GH-PR: 157,216

const mutableEnv = process.env as Record<string, string | undefined>;

function withNodeEnv<T>(value: string | undefined, callback: () => T): T {
  const previous = mutableEnv.NODE_ENV;
  if (value === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = value;

  try {
    return callback();
  } finally {
    if (previous === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previous;
  }
}

function mockRequest(protocol: 'http:' | 'https:', forwardedProtocol?: string) {
  return {
    headers: new Headers(
      forwardedProtocol ? { 'x-forwarded-proto': forwardedProtocol } : undefined,
    ),
    nextUrl: { protocol },
  };
}

test('signed sessions round-trip and reject tampering', async () => {
  const token = await signSessionPayload({
    accountId: 'account-1',
    profileId: 'profile-1',
    username: 'alice',
    name: 'Alice',
    role: 'admin',
    customPermissions: ['iptv_access'],
    mode: 'managed',
    iat: Date.now(),
  }, 'test-secret');

  const decoded = await verifySessionToken(token, 'test-secret');
  assert.equal(decoded?.username, 'alice');
  assert.equal(decoded?.mode, 'managed');

  const parts = token.split('.');
  const tampered = `${parts[0]}.${parts[1]}-tampered.${parts[2]}`;
  assert.equal(await verifySessionToken(tampered, 'test-secret'), null);
});

test('role permissions are limited to admin and user', () => {
  const permissions = resolvePermissions('user');
  assert.ok(permissions.includes('iptv_access'));
  assert.equal(permissions.includes('iptv_source_management'), false);
  assert.equal(hasResolvedPermission('admin', 'player_settings'), true);
  assert.equal(hasResolvedPermission('user', 'account_management'), false);
  assert.equal(hasRoleAtLeast('admin', 'admin'), true);
  assert.equal(hasRoleAtLeast('user', 'admin'), false);
});

test('session cookies are secure only for HTTPS production requests', () => {
  withNodeEnv('production', () => {
    assert.equal(shouldUseSecureSessionCookie(mockRequest('http:')), false);
    assert.equal(shouldUseSecureSessionCookie(mockRequest('https:')), true);
    assert.equal(shouldUseSecureSessionCookie(mockRequest('http:', 'https')), true);
    assert.equal(shouldUseSecureSessionCookie(mockRequest('https:', 'http')), false);
  });

  withNodeEnv('development', () => {
    assert.equal(shouldUseSecureSessionCookie(mockRequest('https:')), false);
  });
});
