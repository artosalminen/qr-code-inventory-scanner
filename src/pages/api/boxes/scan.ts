import { NextApiRequest, NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { isValidTransition, isValidStateForAction, isRoleAllowedForAction, getTargetState } from '@/lib/state-machine';
import { broadcastBoxStateChanged } from '@/lib/broadcast';
import { ScanPayload, ScanAction, BoxState } from '@/types';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withProjectRole(req, res, req.body.projectId, [
    'admin',
    'inventory_management',
    'installation',
  ]);
  if (res.headersSent) return;

  const { projectId, qrCode, action, condition, notes, brokenItems }: ScanPayload = req.body;

  if (!projectId || !qrCode || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Use transaction to handle race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find box and get current state
      const box = await tx.box.findFirst({
        where: { projectId, qrCode },
        include: {
          stateHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!box) {
        throw new Error('BOX_NOT_FOUND');
      }

      const currentState = (box.stateHistory[0]?.state as BoxState) || 'received';

      // Get user's role in project
      const projectUser = await tx.projectUser.findUnique({
        where: {
          idx_project_user_unique: {
            projectId,
            userId: req.userId!,
          },
        },
      });

      if (!projectUser) {
        throw new Error('FORBIDDEN');
      }

      // Validate transition — separate state errors from role errors
      if (!isValidStateForAction(currentState, action as ScanAction)) {
        throw new Error('INVALID_STATE_FOR_ACTION');
      }
      if (!isRoleAllowedForAction(currentState, action as ScanAction, projectUser.role as any)) {
        throw new Error('ROLE_NOT_ALLOWED');
      }
      if (!isValidTransition(currentState, action as ScanAction, projectUser.role as any)) {
        throw new Error('INVALID_TRANSITION');
      }

      const newState = getTargetState(action as ScanAction, currentState);
      if (!newState) {
        throw new Error('INVALID_STATE');
      }

      // Handle special cases for each action
      let installationUser = null;

      if (action === 'activate') {
        installationUser = req.userId;
        await tx.boxInUseSession.create({
          data: {
            boxId: box.id,
            installationUserId: req.userId!,
            usageNotes: notes || null,
          },
        });
      }

      if (action === 'return') {
        await tx.boxInUseSession.updateMany({
          where: { boxId: box.id, completedAt: null },
          data: { completedAt: new Date() },
        });
      }

      // Create state history entry
      const stateHistory = await tx.boxStateHistory.create({
        data: {
          boxId: box.id,
          state: newState,
          stateSetBy: req.userId!,
          changeType: 'scanned',
          condition: condition || null,
          notes: notes || null,
          brokenItems: action === 'check_in' && brokenItems ? brokenItems : null,
          installationUser: newState === 'in_use' ? installationUser : null,
        },
      });

      return {
        box: { ...box, currentState: newState },
        stateHistory,
      };
    });

    // Broadcast state change after response
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user) {
      broadcastBoxStateChanged(projectId, {
        boxId: result.box.id,
        newState: result.stateHistory.state as BoxState,
        user: {
          id: user.id,
          name: user.name || '',
          email: user.email,
        },
        timestamp: result.stateHistory.createdAt,
        condition: result.stateHistory.condition || undefined,
        notes: result.stateHistory.notes || undefined,
      });
    }

    return res.status(200).json({
      success: true,
      box: result.box,
      newState: result.stateHistory.state,
      timestamp: result.stateHistory.createdAt,
    });
  } catch (error: any) {
    if (error.message === 'BOX_NOT_FOUND') {
      return res.status(404).json({ error: 'Box not found in this project' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (error.message === 'INVALID_STATE_FOR_ACTION') {
      return res.status(400).json({ error: 'Box is not in the right state for this action' });
    }
    if (error.message === 'ROLE_NOT_ALLOWED') {
      return res.status(403).json({ error: 'Your role does not allow this action' });
    }
    if (error.message === 'INVALID_TRANSITION') {
      return res.status(400).json({ error: 'Invalid action for this box state' });
    }

    res.status(500).json({ error: error.message });
  }
}
