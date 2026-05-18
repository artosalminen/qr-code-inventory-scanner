import { BoxState, ScanAction, UserRole } from '@/types';

export type StateTransition = {
  from: BoxState;
  to: BoxState;
  action: ScanAction;
  requiredRoles: UserRole[];
};

const validTransitions: StateTransition[] = [
  { from: 'received', to: 'in_use', action: 'activate', requiredRoles: ['admin', 'installation'] },
  { from: 'in_use', to: 'ready_for_checkout', action: 'return', requiredRoles: ['admin', 'installation'] },
  { from: 'ready_for_checkout', to: 'departed', action: 'check_out', requiredRoles: ['admin', 'inventory_management'] },
  { from: 'received', to: 'received', action: 'check_in', requiredRoles: ['admin', 'inventory_management'] },
];

export function isValidTransition(
  currentState: BoxState,
  action: ScanAction,
  userRole: UserRole,
): boolean {
  const transition = validTransitions.find(
    (t) => t.from === currentState && t.action === action,
  );
  if (!transition) return false;
  return transition.requiredRoles.includes(userRole);
}

export function isValidStateForAction(currentState: BoxState, action: ScanAction): boolean {
  return validTransitions.some((t) => t.from === currentState && t.action === action);
}

export function isRoleAllowedForAction(
  currentState: BoxState,
  action: ScanAction,
  userRole: UserRole,
): boolean {
  const transition = validTransitions.find((t) => t.action === action);
  if (!transition) return false;
  return transition.requiredRoles.includes(userRole);
}

export function getTargetState(action: ScanAction, currentState: BoxState): BoxState | null {
  const transition = validTransitions.find((t) => t.action === action && t.from === currentState);
  return transition?.to || null;
}

export function getActionDescription(action: ScanAction): string {
  const descriptions: Record<ScanAction, string> = {
    check_in: 'Check-in',
    activate: 'Activate',
    return: 'Return',
    check_out: 'Check-out',
  };
  return descriptions[action] || action;
}
