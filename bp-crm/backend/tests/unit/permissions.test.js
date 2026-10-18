import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { can, PERMISSIONS, ROLES } from '../../src/config/permissions.js';

describe('role permissions (least privilege)', () => {
  test('every role exists in the matrix', () => {
    for (const r of ROLES) assert.ok(PERMISSIONS[r].size > 0);
  });

  test('sales cannot touch money or admin', () => {
    for (const p of ['payments:read', 'payments:write', 'expenses:read', 'expenses:write', 'investments:read', 'users:read', 'users:write', 'audit:read', 'audit:financial', 'reports:financial', 'subscription:manage', 'invoices:manage', 'exports:read']) {
      assert.equal(can('sales', p), false, `sales must not have ${p}`);
    }
  });

  test('sales can run CRM and draft invoices', () => {
    for (const p of ['customers:write', 'leads:write', 'opportunities:write', 'quotations:write', 'invoices:create']) {
      assert.equal(can('sales', p), true);
    }
  });

  test('finance manages money but not users, settings or CRM writes', () => {
    for (const p of ['payments:write', 'expenses:write', 'invoices:manage', 'reports:financial']) assert.equal(can('finance', p), true);
    for (const p of ['users:write', 'settings:write', 'subscription:manage', 'customers:write', 'leads:write', 'audit:read']) assert.equal(can('finance', p), false, p);
  });

  test('CEO/COO administers but does not record payments or expenses', () => {
    for (const p of ['users:write', 'audit:read', 'reports:financial', 'subscription:manage', 'targets:write']) assert.equal(can('ceo_coo', p), true);
    for (const p of ['payments:write', 'expenses:write', 'customers:write']) assert.equal(can('ceo_coo', p), false, p);
  });

  test('unknown roles and permissions are denied', () => {
    assert.equal(can('intern', 'customers:read'), false);
    assert.equal(can('sales', 'nonexistent:perm'), false);
    assert.equal(can(undefined, 'customers:read'), false);
  });
});
