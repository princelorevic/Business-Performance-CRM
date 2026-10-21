import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, effectiveStatus, WRITABLE_STATUSES } from '../../src/services/subscriptionRules.js';

describe('subscription lifecycle', () => {
  test('a trial cannot become past_due or suspended directly', () => {
    assert.equal(canTransition('trialing', 'past_due'), false);
    assert.equal(canTransition('trialing', 'suspended'), false);
  });
  test('activation is allowed from trial, suspended, expired and canceled only via an explicit transition', () => {
    for (const from of ['trialing', 'past_due', 'suspended', 'canceled', 'expired']) assert.equal(canTransition(from, 'active'), true, from);
    assert.equal(canTransition('active', 'active'), false);
  });
  test('unknown states have no transitions', () => assert.equal(canTransition('bogus', 'active'), false));

  test('a lapsed trial is effectively expired and read-only', () => {
    const sub = { status: 'trialing', trial_ends_at: '2026-01-01 00:00:00' };
    assert.equal(effectiveStatus(sub, new Date('2026-10-17')), 'expired');
    assert.equal(WRITABLE_STATUSES.includes('expired'), false);
  });
  test('a running trial is writable; missing subscription is expired', () => {
    assert.equal(effectiveStatus({ status: 'trialing', trial_ends_at: '2099-01-01 00:00:00' }, new Date('2026-10-17')), 'trialing');
    assert.equal(effectiveStatus(undefined), 'expired');
    assert.equal(WRITABLE_STATUSES.includes('suspended'), false);
  });
});
