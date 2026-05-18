import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Project, ProjectUser, User, Box, BoxState } from '@/types';

interface BoxWithState extends Box {
  stateHistory?: Array<{ state: BoxState }>;
}

const stateOptions = [
  { value: 'expected', label: 'Expected' },
  { value: 'received', label: 'Received' },
  { value: 'in_use', label: 'In Use' },
  { value: 'ready_for_checkout', label: 'Ready for Checkout' },
  { value: 'departed', label: 'Departed' },
] as const;

const roleOptions = [
  { value: 'read_only', label: 'Read-only' },
  { value: 'installation', label: 'Installation' },
  { value: 'inventory_management', label: 'Inventory Mgmt' },
  { value: 'admin', label: 'Admin' },
] as const;

export default function ProjectManagement() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // User assignment
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('read_only');
  const [loading, setLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Add single box
  const [showAddBox, setShowAddBox] = useState(false);
  const [boxQrCode, setBoxQrCode] = useState('');
  const [boxLabel, setBoxLabel] = useState('');
  const [boxDescription, setBoxDescription] = useState('');
  const [addingBox, setAddingBox] = useState(false);

  // CSV upload
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // State override
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [newState, setNewState] = useState<BoxState>('received');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridingState, setOverridingState] = useState(false);
  const [editingLabelBoxId, setEditingLabelBoxId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState('');

  useEffect(() => {
    if (typeof id === 'string' && session) {
      fetchProjectData();
    }
  }, [id, session]);

  async function fetchProjectData() {
    try {
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
      setProjectUsers(projectRes.data.projectUsers || []);

      // Get current user's role from session
      if (session?.user?.email) {
        const userEmail = session.user.email;
        const currentUserProject = projectRes.data.projectUsers?.find(
          (pu: ProjectUser) => pu.userId === (session?.user as any)?.id,
        );
        setUserRole(currentUserProject?.role || null);
      }

      try {
        const usersRes = await axios.get('/api/users');
        setUsers(usersRes.data);
      } catch (e) {
        setUsers([]);
      }

      try {
        const boxesRes = await axios.get(`/api/projects/${id}/boxes`);
        setBoxes(boxesRes.data);
      } catch (e) {
        console.error('Failed to fetch boxes:', e);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  }

  async function assignUser() {
    if (!selectedUserId || !id) return;
    setLoading(true);
    setAssignmentError(null);
    try {
      await axios.post(`/api/projects/${id}/users`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setSelectedUserId('');
      fetchProjectData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to assign user';
      setAssignmentError(message);
      console.error('Failed to assign user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(userId: string) {
    try {
      await axios.delete(`/api/projects/${id}/users/${userId}`);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  async function addBox() {
    if (!boxQrCode.trim() || !id) return;
    setAddingBox(true);
    try {
      await axios.post(`/api/projects/${id}/boxes`, {
        qrCode: boxQrCode,
        label: boxLabel,
        description: boxDescription,
      });
      setBoxQrCode('');
      setBoxLabel('');
      setBoxDescription('');
      setShowAddBox(false);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to add box:', error);
    } finally {
      setAddingBox(false);
    }
  }

  async function uploadCsv() {
    if (!csvFile || !id) return;
    setUploadingCsv(true);
    try {
      const csvContent = await csvFile.text();
      await axios.post(`/api/projects/${id}/csv-upload`, { csvContent });
      setCsvFile(null);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to upload CSV:', error);
    } finally {
      setUploadingCsv(false);
    }
  }

  async function overrideBoxState(boxId: string) {
    if (!newState || !overrideReason.trim() || !id) return;
    setOverridingState(true);
    try {
      await axios.post(`/api/boxes/${boxId}/state-override`, {
        newState,
        notes: overrideReason,
      });
      setSelectedBoxId(null);
      setOverrideReason('');
      setNewState('received');
      fetchProjectData();
    } catch (error) {
      console.error('Failed to override state:', error);
    } finally {
      setOverridingState(false);
    }
  }

  async function saveLabel(boxId: string) {
    if (!id || savingLabel) return;
    setSavingLabel(true);
    setLabelError('');
    try {
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, {
        label: editingLabelValue,
      });
      setEditingLabelBoxId(null);
      fetchProjectData();
    } catch (error: any) {
      setLabelError(error.response?.data?.error || 'Failed to save label');
    } finally {
      setSavingLabel(false);
    }
  }

  const canManageBoxes = userRole && ['admin', 'inventory_management'].includes(userRole);
  const isAdmin = userRole === 'admin';

  if (!project)
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">Loading project...</p>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium mb-4 flex items-center gap-1"
          >
            ← Back to Admin
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{project.name}</h1>
          <p className="text-slate-400 mt-2">Manage boxes and team members</p>
        </div>

        {/* Add Box Section */}
        {canManageBoxes && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">➕ Add Box</h2>
              {!showAddBox ? (
                <button
                  onClick={() => setShowAddBox(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition active:scale-95"
                >
                  Add Single Box
                </button>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="QR Code *"
                    value={boxQrCode}
                    onChange={(e) => setBoxQrCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={boxLabel}
                    onChange={(e) => setBoxLabel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={boxDescription}
                    onChange={(e) => setBoxDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <button
                      onClick={addBox}
                      disabled={addingBox || !boxQrCode.trim()}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                    >
                      {addingBox ? 'Adding...' : 'Add Box'}
                    </button>
                    <button
                      onClick={() => setShowAddBox(false)}
                      className="flex-1 sm:flex-initial px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV Upload */}
        {isAdmin && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">📤 Upload CSV</h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <p className="text-sm text-slate-400">CSV format: qr_code, label, description</p>
                <button
                  onClick={uploadCsv}
                  disabled={uploadingCsv || !csvFile}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {uploadingCsv ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Boxes List */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">📦 Boxes ({boxes.length})</h2>
            {boxes.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {boxes.map((box) => {
                  const currentState = box.stateHistory?.[0]?.state || 'received';
                  return (
                    <div key={box.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-50 truncate">{box.qrCode}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-400 truncate">
                              {box.label || <span className="italic text-slate-500">No label</span>}
                            </span>
                            {canManageBoxes && (
                              <button
                                onClick={() => {
                                  setEditingLabelBoxId(box.id);
                                  setEditingLabelValue(box.label || '');
                                  setLabelError('');
                                  setSelectedBoxId(null);
                                }}
                                className="text-slate-500 hover:text-slate-300 transition shrink-0"
                                title="Edit label"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          <div className="mt-2 inline-block">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200 capitalize">
                              {currentState}
                            </span>
                          </div>
                        </div>
                        {canManageBoxes && (
                          <button
                            onClick={() => { setSelectedBoxId(box.id); setEditingLabelBoxId(null); }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition active:scale-95"
                          >
                            Change State
                          </button>
                        )}
                      </div>

                      {selectedBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <select
                            value={newState}
                            onChange={(e) => setNewState(e.target.value as BoxState)}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            {stateOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            placeholder="Reason for change *"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <button
                              onClick={() => overrideBoxState(box.id)}
                              disabled={overridingState || !overrideReason.trim()}
                              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                            >
                              {overridingState ? 'Updating...' : 'Confirm Change'}
                            </button>
                            <button
                              onClick={() => setSelectedBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {editingLabelBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <label className="block text-sm font-medium text-slate-300">Edit Label</label>
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            placeholder="Box label..."
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(box.id); if (e.key === 'Escape') setEditingLabelBoxId(null); }}
                            autoFocus
                          />
                          {labelError && (
                            <p className="text-sm text-red-400">{labelError}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveLabel(box.id)}
                              disabled={savingLabel}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                            >
                              {savingLabel ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingLabelBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400">No boxes in this project yet.</p>
            )}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">👥 Assign Users</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select user...</option>
                  {users
                    .filter((u) => !projectUsers.find((pu) => pu.userId === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={assignUser}
                disabled={loading || !selectedUserId}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? 'Assigning...' : 'Assign User'}
              </button>
              {assignmentError && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-800 p-3 rounded-lg">
                  {assignmentError}
                </p>
              )}
              {users.length === 0 && (
                <p className="text-sm text-slate-400">
                  No users available. Create a project and login first.
                </p>
              )}
              {projectUsers.length > 0 &&
                users.filter((u) => !projectUsers.find((pu) => pu.userId === u.id)).length === 0 && (
                  <p className="text-sm text-slate-400">
                    All available users are already assigned to this project.
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Project Users */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">Team Members</h2>
            {projectUsers.length > 0 ? (
              <div className="space-y-2">
                {projectUsers.map((pu) => (
                  <div key={pu.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-50 truncate">
                        {pu.user?.name || pu.user?.email || pu.userId}
                      </div>
                      {pu.user?.name && pu.user?.email && (
                        <div className="text-xs text-slate-500 truncate">{pu.user.email}</div>
                      )}
                      <div className="text-sm text-slate-400 capitalize">{pu.role.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => removeUser(pu.userId)}
                      className="ml-4 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded-lg font-medium transition text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No users assigned to this project yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
