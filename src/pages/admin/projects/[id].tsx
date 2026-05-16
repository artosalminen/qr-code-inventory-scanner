import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Project, ProjectUser, User } from '@/types';

export default function ProjectManagement() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('read_only');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof id === 'string') {
      fetchProjectData();
    }
  }, [id]);

  async function fetchProjectData() {
    try {
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
      setProjectUsers(projectRes.data.projectUsers || []);

      // Try to fetch all users (may not exist yet)
      try {
        const usersRes = await axios.get('/api/users');
        setUsers(usersRes.data);
      } catch (e) {
        // Endpoint may not exist yet, use empty list
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  }

  async function assignUser() {
    if (!selectedUserId || !id) return;

    setLoading(true);
    try {
      const { data } = await axios.post(`/api/projects/${id}/users`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setProjectUsers([...projectUsers, data]);
      setSelectedUserId('');
    } catch (error) {
      console.error('Failed to assign user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(userId: string) {
    try {
      await axios.delete(`/api/projects/${id}/users/${userId}`);
      setProjectUsers(projectUsers.filter((u) => u.userId !== userId));
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  if (!project)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/admin')}
          className="mb-4 px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          ← Back to Admin
        </button>

        <h1 className="text-2xl font-bold mb-6">{project.name}</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold mb-4">Assign Users</h2>
          <div className="flex gap-2 mb-4">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="read_only">Read-only</option>
              <option value="installation">Installation</option>
              <option value="inventory_management">Inventory Mgmt</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={assignUser}
              disabled={loading || !selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
          {users.length === 0 && (
            <p className="text-sm text-gray-600">No users available. Create a project and login first.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Project Users</h2>
            {projectUsers.length > 0 ? (
              <div className="space-y-2">
                {projectUsers.map((pu) => (
                  <div key={pu.id} className="flex items-center justify-between p-3 bg-gray-100 rounded">
                    <div>
                      <div className="font-medium">{pu.userId}</div>
                      <div className="text-sm text-gray-600">{pu.role}</div>
                    </div>
                    <button
                      onClick={() => removeUser(pu.userId)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No users assigned to this project yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
