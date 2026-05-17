import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '@/components/Dashboard';
import Layout from '@/components/Layout';
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
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">Dashboard</h1>
            <p className="text-slate-400 mt-1">Track your box inventory in real-time</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-50 rounded-lg hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProjectId && <Dashboard projectId={selectedProjectId} />}
      </div>
    </Layout>
  );
}
