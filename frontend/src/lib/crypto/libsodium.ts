import sodium from 'libsodium-wrappers-sumo';

let isReady = false;

/**
 * Initialize libsodium. Must be called before using any crypto functions.
 * Safe to call multiple times - only initializes once.
 * @returns The initialized sodium instance
 */
export async function initSodium(): Promise<typeof sodium> {
  if (!isReady) {
    await sodium.ready;
    isReady = true;
  }
  return sodium;
}

export { sodium };
