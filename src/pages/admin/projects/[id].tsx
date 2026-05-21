import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Project, ProjectUser, User, Box, BoxState } from '@/types';
import { useTranslations } from 'next-intl';

interface BoxWithState extends Box {
  stateHistory?: Array<{ state: BoxState }>;
}

const stateValues: BoxState[] = ['expected', 'received', 'in_use', 'ready_for_checkout', 'departed'];
const roleValues = ['read_only', 'installation', 'inventory_management', 'admin'] as const;

export default function ProjectManagement() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tStates = useTranslations('states');

  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('read_only');
  const [loading, setLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [showAddBox, setShowAddBox] = useState(false);
  const [boxQrCode, setBoxQrCode] = useState('');
  const [boxLabel, setBoxLabel] = useState('');
  const [boxDescription, setBoxDescription] = useState('');
  const [addingBox, setAddingBox] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [newState, setNewState] = useState<BoxState>('received');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridingState, setOverridingState] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [editingQrCode, setEditingQrCode] = useState('');
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [savingBox, setSavingBox] = useState(false);
  const [boxEditError, setBoxEditError] = useState('');

  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const roleLabels: Record<string, string> = {
    read_only: t('roleReadOnly'),
    installation: t('roleInstallation'),
    inventory_management: t('roleInventoryMgmt'),
    admin: t('roleAdmin'),
  };

  const roleDisplayLabels: Record<string, string> = {
    read_only: t('roleReadOnlyDisplay'),
    installation: t('roleInstallationDisplay'),
    inventory_management: t('roleInventoryMgmtDisplay'),
    admin: t('roleAdminDisplay'),
  };

  useEffect(() => {
    if (typeof id === 'string' && session) fetchProjectData();
  }, [id, session]);

  useEffect(() => {
    if (session) {
      axios.get('/api/auth/user')
        .then((res) => { if (!res.data.isAdmin) router.push('/dashboard'); })
        .catch(() => router.push('/dashboard'));
    }
  }, [session, router]);

  async function fetchProjectData() {
    try {
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
      setEditingName(projectRes.data.name);
      setProjectUsers(projectRes.data.projectUsers || []);
      if (session?.user?.email) {
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
      await axios.post(`/api/projects/${id}/users`, { userId: selectedUserId, role: selectedRole });
      setSelectedUserId('');
      fetchProjectData();
    } catch (error: any) {
      setAssignmentError(error.response?.data?.error || t('assignFailed'));
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
      await axios.post(`/api/boxes/${boxId}/state-override`, { newState, notes: overrideReason });
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

  async function saveBoxDetails(boxId: string) {
    if (!id || savingBox) return;
    setSavingBox(true);
    setBoxEditError('');

    if (!editingQrCode.trim()) {
      setBoxEditError(t('qrCodeRequiredForEdit'));
      setSavingBox(false);
      return;
    }

    try {
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, {
        qrCode: editingQrCode,
        label: editingLabel,
        description: editingDescription,
      });
      setEditingBoxId(null);
      fetchProjectData();
    } catch (error: any) {
      setBoxEditError(error.response?.data?.error || t('saveLabelFailed'));
    } finally {
      setSavingBox(false);
    }
  }

  async function saveProjectName() {
    if (!id || savingName || !editingName.trim()) return;
    setSavingName(true);
    setNameError('');
    try {
      await axios.put(`/api/projects/${id}`, { name: editingName.trim() });
      fetchProjectData();
    } catch (error: any) {
      setNameError(error.response?.data?.error || t('saveNameFailed'));
    } finally {
      setSavingName(false);
    }
  }

  async function toggleArchive(newStatus: 'active' | 'archived') {
    if (!id || archiving) return;
    setArchiving(true);
    setArchiveError('');
    try {
      await axios.put(`/api/projects/${id}`, { status: newStatus });
      setShowArchiveConfirm(false);
      fetchProjectData();
    } catch (error: any) {
      setArchiveError(error.response?.data?.error || t('archiveFailed'));
    } finally {
      setArchiving(false);
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
            <p className="text-slate-400">{t('loadingProject')}</p>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium mb-4 flex items-center gap-1"
          >
            {t('backToAdmin')}
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{project.name}</h1>
          <p className="text-slate-400 mt-2">{t('manageBoxesTeam')}</p>
        </div>

        {isAdmin && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-bold text-slate-50">{t('projectSettings')}</h2>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">{t('projectName')}</label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(); }}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={saveProjectName}
                    disabled={savingName || !editingName.trim() || editingName.trim() === project.name}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                  >
                    {savingName ? tCommon('saving') : t('saveProjectName')}
                  </button>
                </div>
                {nameError && <p className="text-sm text-red-400">{nameError}</p>}
              </div>

              <div className="pt-4 border-t border-slate-700 space-y-3">
                {project.status === 'archived' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900 text-amber-300 border border-amber-700">
                        {t('archivedBadge')}
                      </span>
                      {project.archivedAt && (
                        <span className="text-sm text-slate-400">
                          {t('archivedAt')} {new Date(project.archivedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleArchive('active')}
                      disabled={archiving}
                      className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                    >
                      {archiving ? tCommon('updating') : t('unarchiveProject')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!showArchiveConfirm ? (
                      <button
                        onClick={() => setShowArchiveConfirm(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-700 hover:bg-amber-900 border border-slate-600 hover:border-amber-700 text-slate-300 hover:text-amber-300 rounded-lg font-medium transition"
                      >
                        {t('archiveProject')}
                      </button>
                    ) : (
                      <div className="space-y-3 p-4 bg-amber-950 border border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-200">{t('archiveConfirmMessage')}</p>
                        <div className="flex gap-2 flex-col sm:flex-row">
                          <button
                            onClick={() => toggleArchive('archived')}
                            disabled={archiving}
                            className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium transition"
                          >
                            {archiving ? tCommon('updating') : t('confirmArchive')}
                          </button>
                          <button
                            onClick={() => setShowArchiveConfirm(false)}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                          >
                            {tCommon('cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {archiveError && <p className="text-sm text-red-400">{archiveError}</p>}
              </div>
            </div>
          </div>
        )}

        {canManageBoxes && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">{t('addBox')}</h2>
              {!showAddBox ? (
                <button
                  onClick={() => setShowAddBox(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition active:scale-95"
                >
                  {t('addSingleBox')}
                </button>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('qrCodeRequired')}
                    value={boxQrCode}
                    onChange={(e) => setBoxQrCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder={t('boxLabelPlaceholder')}
                    value={boxLabel}
                    onChange={(e) => setBoxLabel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder={t('descriptionOptional')}
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
                      {addingBox ? tCommon('adding') : t('addBoxButton')}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBox(false);
                        setBoxQrCode('');
                        setBoxLabel('');
                        setBoxDescription('');
                      }}
                      className="flex-1 sm:flex-initial px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                    >
                      {tCommon('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">{t('uploadCsv')}</h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <p className="text-sm text-slate-400">{t('csvFormat')}</p>
                <button
                  onClick={uploadCsv}
                  disabled={uploadingCsv || !csvFile}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {uploadingCsv ? tCommon('uploading') : t('uploadCsvButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('boxes')} ({boxes.length})</h2>
            {boxes.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {boxes.map((box) => {
                  const currentState = (box.stateHistory?.[0]?.state || 'received') as BoxState;
                  return (
                    <div key={box.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-50 truncate">{box.qrCode}</div>
                          {box.label && <div className="text-sm text-slate-300 truncate mt-0.5">{box.label}</div>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-400 truncate">
                              {box.description || <span className="italic text-slate-500">{tCommon('noDescription')}</span>}
                            </span>
                            {canManageBoxes && (
                              <button
                                onClick={() => {
                                  setEditingBoxId(box.id);
                                  setEditingQrCode(box.qrCode || '');
                                  setEditingLabel(box.label || '');
                                  setEditingDescription(box.description || '');
                                  setBoxEditError('');
                                  setSelectedBoxId(null);
                                }}
                                className="text-slate-500 hover:text-slate-300 transition shrink-0"
                                title={tCommon('edit')}
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          <div className="mt-2 inline-block">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200">
                              {tStates(currentState)}
                            </span>
                          </div>
                        </div>
                        {canManageBoxes && (
                          <button
                            onClick={() => { setSelectedBoxId(box.id); setEditingBoxId(null); }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition active:scale-95"
                          >
                            {t('changeState')}
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
                            {stateValues.map((s) => (
                              <option key={s} value={s}>{tStates(s)}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder={t('reasonForChange')}
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
                              {overridingState ? tCommon('updating') : t('confirmChange')}
                            </button>
                            <button
                              onClick={() => setSelectedBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              {tCommon('cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {editingBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <label className="block text-sm font-medium text-slate-300">{t('editBoxDetails')}</label>
                          <input
                            type="text"
                            value={editingQrCode}
                            onChange={(e) => setEditingQrCode(e.target.value)}
                            placeholder={t('qrCodeRequired')}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveBoxDetails(box.id);
                              if (e.key === 'Escape') setEditingBoxId(null);
                            }}
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            placeholder={t('boxLabelPlaceholder')}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            placeholder={t('descriptionOptional')}
                            rows={3}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          {boxEditError && <p className="text-sm text-red-400">{boxEditError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveBoxDetails(box.id)}
                              disabled={savingBox || !editingQrCode.trim()}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                            >
                              {savingBox ? tCommon('saving') : tCommon('save')}
                            </button>
                            <button
                              onClick={() => setEditingBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              {tCommon('cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400">{t('noBoxes')}</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('assignUsers')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('selectUser')}</option>
                  {users
                    .filter((u) => !projectUsers.find((pu) => pu.userId === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleValues.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={assignUser}
                disabled={loading || !selectedUserId}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? tCommon('assigning') : t('assignUser')}
              </button>
              {assignmentError && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-800 p-3 rounded-lg">
                  {assignmentError}
                </p>
              )}
              {users.length === 0 && (
                <p className="text-sm text-slate-400">{t('noUsersAvailable')}</p>
              )}
              {projectUsers.length > 0 &&
                users.filter((u) => !projectUsers.find((pu) => pu.userId === u.id)).length === 0 && (
                  <p className="text-sm text-slate-400">{t('allUsersAssigned')}</p>
                )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('teamMembers')}</h2>
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
                      <div className="text-sm text-slate-400">{roleDisplayLabels[pu.role] || pu.role.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => removeUser(pu.userId)}
                      className="ml-4 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded-lg font-medium transition text-sm"
                    >
                      {tCommon('remove')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">{t('noUsersAssigned')}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
