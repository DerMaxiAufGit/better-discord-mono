import { blockService } from './blockService.js';
import { friendService } from './friendService.js';

export type CallAuthResult =
  | { ok: true }
  | { ok: false; reason: 'not_friends' | 'blocked' };

type CallAuthDeps = {
  areFriends: (userId1: string, userId2: string) => Promise<boolean>;
  isBlockedBidirectional: (userId1: string, userId2: string) => Promise<boolean>;
};

const defaultDeps: CallAuthDeps = {
  areFriends: (userId1, userId2) => friendService.areFriends(userId1, userId2),
  isBlockedBidirectional: (userId1, userId2) => blockService.isBlockedBidirectional(userId1, userId2),
};

export async function canSignalCall(
  userId: string,
  recipientId: string,
  deps: CallAuthDeps = defaultDeps
): Promise<CallAuthResult> {
  const isFriend = await deps.areFriends(userId, recipientId);
  if (!isFriend) {
    return { ok: false, reason: 'not_friends' };
  }

  const isBlocked = await deps.isBlockedBidirectional(userId, recipientId);
  if (isBlocked) {
    return { ok: false, reason: 'blocked' };
  }

  return { ok: true };
}
