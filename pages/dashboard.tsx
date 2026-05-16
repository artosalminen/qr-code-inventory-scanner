import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '@/components/Dashboard';
import { Project } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => router.push('/scanner')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Scanner
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {selectedProjectId && <Dashboard projectId={selectedProjectId} />}
      </main>
    </div>
  );
}
