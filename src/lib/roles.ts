import { Chain, PlayerRole } from './types';

/**
 * Determines the dynamic player role for an intercepted chain.
 *
 * Rules:
 * 1. Hop 0 is always 'shifter'.
 * 2. If the last recorded hop was 'decoder', the next hop is ALWAYS 'shifter' (prevents consecutive decoders after bonus hops).
 * 3. Every 10th hop (hop 10, 20, 30, ...) is assigned to 'decoder'.
 * 4. All other turns are assigned to 'shifter'.
 *
 * @param chain Partial chain state containing currentHop and history
 * @returns PlayerRole ('shifter' | 'decoder')
 */
export function determinePlayerRole(
  chain: Pick<Chain, 'currentHop' | 'history'>
): PlayerRole {
  // Guard 1: Hop 0 or empty history is ALWAYS Shifter
  if (!chain || chain.currentHop === 0 || !chain.history || chain.history.length === 0) {
    return 'shifter';
  }

  // Guard 2: Consecutive Decoder Guard
  // If the previous turn was already a Decoder deduction, force Shifter
  const lastHop = chain.history[chain.history.length - 1];
  if (lastHop && lastHop.role === 'decoder') {
    return 'shifter';
  }

  // Guard 3: Every 10th hop is Decoder
  if (chain.currentHop % 10 === 0) {
    return 'decoder';
  }

  return 'shifter';
}

/**
 * Calculates remaining hops until the next Decoder milestone.
 */
export function getHopsUntilNextDecoder(currentHop: number): number {
  if (currentHop <= 0) return 10;
  const remainder = currentHop % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}
