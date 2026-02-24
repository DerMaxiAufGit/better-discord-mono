import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/index.js', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/db/index.js';
import { friendService } from '../../src/services/friendService.js';

describe('friendService.restoreFriendship', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('does nothing when no prior relationship exists', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await friendService.restoreFriendship('user-a', 'user-b');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/SELECT \*/);
  });

  it('does not change accepted friendships', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 10, status: 'accepted' }] });

    await friendService.restoreFriendship('user-a', 'user-b');

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('restores a pending friendship by updating to accepted', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 11, status: 'pending' }] });
    query.mockResolvedValueOnce({ rows: [] });

    await friendService.restoreFriendship('user-a', 'user-b');

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toMatch(/UPDATE friend_requests/);
  });

  it('restores a rejected friendship by updating to accepted', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 12, status: 'rejected' }] });
    query.mockResolvedValueOnce({ rows: [] });

    await friendService.restoreFriendship('user-a', 'user-b');

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toMatch(/UPDATE friend_requests/);
  });
});
