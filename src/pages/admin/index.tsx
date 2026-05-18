import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Project } from '@/types';
import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/auth/user')
        .then((res) => { if (!res.data.isAdmin) router.push('/dashboard'); })
        .catch(() => router.push('/dashboard'));
    }
  }, [status, router]);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects?status=all');
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
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">{tCommon('loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{t('title')}</h1>
          <p className="text-slate-400 mt-2">{t('subtitle')}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('createNewProject')}</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('projectNamePlaceholder')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder={t('projectDescPlaceholder')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={createProject}
                disabled={loading || !newProjectName.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? tCommon('creating') : t('createProject')}
              </button>
            </div>
          </div>
        </div>

        {projects.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-slate-50 mb-4">{t('yourProjects')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition group"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-50 group-hover:text-blue-400 transition">
                          {project.name}
                        </h3>
                        {project.status === 'archived' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900 text-amber-300 border border-amber-700">
                            {t('archivedBadge')}
                          </span>
                        )}
                      </div>
                      {project.status === 'archived' && project.archivedAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          {t('archivedAt')} {new Date(project.archivedAt).toLocaleDateString()}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/admin/projects/${project.id}`)}
                      className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition active:scale-95"
                    >
                      {t('manageProject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-slate-400">{t('noProjects')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
