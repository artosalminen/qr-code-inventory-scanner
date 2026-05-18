// src/types/index.ts
export type UserRole = 'admin' | 'inventory_management' | 'installation' | 'read_only';

export type BoxState = 'expected' | 'received' | 'in_use' | 'ready_for_checkout' | 'departed';

export type ChangeType = 'scanned' | 'manual_override';

export type ProjectStatus = 'active' | 'archived';

export type QRMode = 'check-in' | 'check-out';

export type ScanAction = 'check_in' | 'activate' | 'return' | 'check_out';

export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  csvUploadedAt: Date | null;
  defaultQrMode: QRMode;
  status: ProjectStatus;
  createdBy: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectUser {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  assignedAt: Date;
  assignedBy: string | null;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface Box {
  id: string;
  projectId: string;
  qrCode: string;
  label: string;
  description: string | null;
  createdAt: Date;
}

export interface BoxStateHistory {
  id: string;
  boxId: string;
  state: BoxState;
  stateSetBy: string;
  changeType: ChangeType;
  condition: string | null;
  notes: string | null;
  brokenItems: string | null;
  installationUser: string | null;
  createdAt: Date;
}

export interface BoxInUseSession {
  id: string;
  boxId: string;
  installationUserId: string;
  usageNotes: string | null;
  activatedAt: Date;
  completedAt: Date | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface ScanPayload {
  projectId: string;
  qrCode: string;
  action: ScanAction;
  condition?: string;
  notes?: string;
  brokenItems?: string;
}

export interface ScanResponse {
  success: boolean;
  box: Box | null;
  newState: BoxState | null;
  message: string;
  timestamp: Date;
}
