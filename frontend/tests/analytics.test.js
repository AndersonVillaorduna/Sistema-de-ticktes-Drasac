import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyTicketCounts } from '../src/utils/analytics.js';

test('weekly windows are disjoint and exclude future or invalid timestamps', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const tickets = ['2026-09-29T12:00:00Z', '2026-09-22T12:00:01Z',
    '2026-09-22T12:00:00Z', '2026-09-15T12:00:01Z',
    '2026-09-15T12:00:00Z', '2026-10-01T00:00:00Z', 'invalid']
    .map(created_at => ({ created_at }));
  assert.deepEqual(weeklyTicketCounts(tickets, now), { thisWeek: 2, lastWeek: 2 });
});

test('explicit UTC and Lima dates denote the same instant', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const dates = ['2026-09-28T12:00:00Z', '2026-09-28T07:00:00-05:00'];
  assert.deepEqual(weeklyTicketCounts(dates.map(created_at => ({ created_at })), now),
    { thisWeek: 2, lastWeek: 0 });
});
