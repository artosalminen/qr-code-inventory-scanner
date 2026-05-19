import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import {
  INITIAL_BOX_STATE,
  isValidStateForAction,
  isRoleAllowedForAction,
} from '@/lib/state-machine';
import { BoxState, ScanAction, UserRole } from '@/types';

export interface PreviewResponse {
  box: {
    id: string;
    label: string | null;
    qrCode: string;
    currentState: BoxState;
  } | null;
  valid: boolean;
  reason?: string;
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse<PreviewResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ box: null, valid: false, reason: 'Method not allowed' });
  }

  const { qrCode, projectId, action } = req.query;

  if (!qrCode || !projectId || !action) {
    return res
      .status(400)
      .json({ box: null, valid: false, reason: 'Missing required parameters: qrCode, projectId, action' });
  }

  // Validate action is a known ScanAction
  const validActions = ['check_in', 'activate', 'return', 'check_out'] as const;
  if (!validActions.includes(action as any)) {
    return res.status(400).json({
      box: null,
      valid: false,
      reason: `Invalid action. Must be one of: ${validActions.join(', ')}`,
    });
  }

  // Validate session and project role — only require read-level access
  await withProjectRole(req, res, projectId as string, ['admin', 'inventory_management', 'installation', 'read_only']);
  if (res.headersSent) return;

  try {
    // Find box
    const box = await prisma.box.findFirst({
      where: {
        projectId: projectId as string,
        qrCode: qrCode as string,
      },
    });

    if (!box) {
      return res.status(200).json({
        box: null,
        valid: false,
        reason: 'Box not found in this project',
      });
    }

    // Get current state from latest history entry
    const latestHistory = await prisma.boxStateHistory.findFirst({
      where: { boxId: box.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    // If no history exists, box is in its initial state (expected per inventory spec)
    const currentState = (latestHistory?.state as BoxState) || INITIAL_BOX_STATE;

    // Get user's role in project (should be attached by withProjectRole middleware)
    const projectUser = (req as any).projectUser;
    if (!projectUser) {
      return res.status(403).json({
        box: null,
        valid: false,
        reason: 'Unauthorized',
      });
    }

    // Validate transition using state machine functions
    const actionStr = action as string;
    const isStateValid = isValidStateForAction(currentState, actionStr as ScanAction);
    const isRoleValid = isRoleAllowedForAction(
      currentState,
      actionStr as ScanAction,
      projectUser.role as UserRole,
    );

    if (!isStateValid || !isRoleValid) {
      const reason = !isStateValid
        ? `Box is in state ${currentState} — cannot ${actionStr}`
        : 'Your role cannot perform this action';
      return res.status(200).json({
        box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
        valid: false,
        reason,
      });
    }

    // For 'activate' action, check if box is already in use (get who)
    if (actionStr === 'activate' && currentState === 'in_use') {
      const session = await prisma.boxInUseSession.findFirst({
        where: { boxId: box.id, completedAt: null },
        include: { installationUser: true },
      });
      const username = session?.installationUser?.name || 'unknown user';
      return res.status(200).json({
        box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
        valid: false,
        reason: `Box is already in use by ${username}`,
      });
    }

    return res.status(200).json({
      box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
      valid: true,
    });
  } catch (error: any) {
    // Only log unexpected errors (not validation failures)
    if (error instanceof Error) {
      console.error('Unexpected error in preview endpoint:', error.message);
    } else {
      console.error('Unexpected error in preview endpoint:', error);
    }
    return res.status(500).json({ box: null, valid: false, reason: 'Server error' });
  }
}
