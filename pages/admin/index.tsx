import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Project } from '@/types';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    setLoading(true);
    try {
      const { data } = await axios.post('/api/projects', {
        name: newProjectName,
        description: newProjectDescription || undefined,
      });
      setProjects([...projects, data]);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Create New Project</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-3 py-2 border rounded"
            />
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              placeholder="Project description (optional)..."
              className="w-full px-3 py-2 border rounded"
              rows={2}
            />
            <button
              onClick={createProject}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{project.name}</h3>
                  <p className="text-sm text-gray-600">{project.description}</p>
                </div>
                <button
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
