import { describe, expect, it, vi } from 'vitest';

import { canSignalCall } from '../../src/services/callAuth.js';

describe('canSignalCall', () => {
  it('rejects when users are not friends', async () => {
    const areFriends = vi.fn().mockResolvedValue(false);
    const isBlockedBidirectional = vi.fn();

    const result = await canSignalCall('user-a', 'user-b', {
      areFriends,
      isBlockedBidirectional,
    });

    expect(result).toEqual({ ok: false, reason: 'not_friends' });
    expect(areFriends).toHaveBeenCalledWith('user-a', 'user-b');
    expect(isBlockedBidirectional).not.toHaveBeenCalled();
  });

  it('rejects when either user has blocked the other', async () => {
    const areFriends = vi.fn().mockResolvedValue(true);
    const isBlockedBidirectional = vi.fn().mockResolvedValue(true);

    const result = await canSignalCall('user-a', 'user-b', {
      areFriends,
      isBlockedBidirectional,
    });

    expect(result).toEqual({ ok: false, reason: 'blocked' });
    expect(isBlockedBidirectional).toHaveBeenCalledWith('user-a', 'user-b');
  });

  it('allows when users are friends and not blocked', async () => {
    const areFriends = vi.fn().mockResolvedValue(true);
    const isBlockedBidirectional = vi.fn().mockResolvedValue(false);

    const result = await canSignalCall('user-a', 'user-b', {
      areFriends,
      isBlockedBidirectional,
    });

    expect(result).toEqual({ ok: true });
  });
});
