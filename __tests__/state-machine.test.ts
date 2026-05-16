import { isValidTransition, getTargetState } from '@/lib/state-machine';

describe('State Machine', () => {
  it('should allow inventory to check-in', () => {
    const result = isValidTransition('received', 'check_in', 'inventory_management');
    expect(result).toBe(true);
  });

  it('should allow installation to activate', () => {
    const result = isValidTransition('received', 'activate', 'installation');
    expect(result).toBe(true);
  });

  it('should prevent installation from checking out', () => {
    const result = isValidTransition('ready_for_checkout', 'check_out', 'installation');
    expect(result).toBe(false);
  });

  it('should return correct target state', () => {
    const state = getTargetState('activate', 'received');
    expect(state).toBe('in_use');
  });
});
