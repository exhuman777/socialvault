'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import DownloadForm from '@/components/DownloadForm';
import JobList from '@/components/JobList';
import ResultView, { type ResultData } from '@/components/ResultView';
import DependencyCheck from '@/components/DependencyCheck';
import About from '@/components/About';
import { ToastProvider, useToast } from '@/components/Toast';

type Platform = 'tiktok' | 'instagram';

interface JobData {
  id: string;
  status: string;
  platform?: string;
  target: string;
  mode: string;
  progress?: {
    total: number;
    completed: number;
    current_item?: string;
    percent: number;
  };
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  item_count?: number;
  download_path?: string;
}

function DashboardContent() {
  const [view, setView] = useState<'download' | 'history'>('download');
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [selectedJob, setSelectedJob] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const prevJobsRef = useRef<JobData[]>([]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/v1/jobs');
        const data = await res.json();
        if (data.data?.jobs) {
          const newJobs: JobData[] = data.data.jobs;
          const prev = prevJobsRef.current;

          for (const job of newJobs) {
            const prevJob = prev.find((j) => j.id === job.id);
            if (prevJob && prevJob.status !== 'completed' && job.status === 'completed') {
              addToast('success', `Download complete: ${job.item_count || 0} files`);
            }
            if (prevJob && prevJob.status !== 'failed' && job.status === 'failed') {
              addToast('error', `Download failed: ${job.error || 'Unknown error'}`);
            }
          }

          prevJobsRef.current = newJobs;
          setJobs(newJobs);

          const hasActive = newJobs.some((j) => j.status === 'processing' || j.status === 'queued');
          timeoutId = setTimeout(fetchJobs, hasActive ? 3000 : 10000);
        } else {
          timeoutId = setTimeout(fetchJobs, 10000);
        }
      } catch {
        timeoutId = setTimeout(fetchJobs, 10000);
      }
    };

    fetchJobs();
    return () => clearTimeout(timeoutId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(
    async (target: string, platform: Platform | undefined, mode: 'profile' | 'single') => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, platform, mode }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message || 'Failed to create download job');
          return;
        }
        addToast('info', 'Download job created');
        setView('history');
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  const handleOpenFolder = useCallback(async (path: string) => {
    try {
      await fetch('/api/v1/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch {
      navigator.clipboard.writeText(path);
      addToast('info', 'Path copied to clipboard');
    }
  }, [addToast]);

  const handleSelectJob = useCallback(async (job: JobData) => {
    if (job.status === 'completed') {
      try {
        const res = await fetch(`/api/v1/download?job_id=${job.id}`);
        const data = await res.json();
        if (data.data) setSelectedJob(data.data as ResultData);
      } catch {
        setSelectedJob(job as unknown as ResultData);
      }
    }
  }, []);

  // Full-width when gallery is showing, normal width otherwise
  if (selectedJob) {
    return (
      <div style={{ width: '100%' }}>
        <ResultView
          job={selectedJob}
          onBack={() => setSelectedJob(null)}
          onOpenFolder={handleOpenFolder}
        />
      </div>
    );
  }

  return (
    <>
      <Header
        view={view}
        onViewChange={setView}
        jobCount={jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {view === 'download' ? (
          <div className="mx-auto max-w-md">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold" style={{ color: '#fff' }}>
                Download your content
              </h2>
              <p className="mt-1 text-sm" style={{ color: '#666' }}>
                TikTok & Instagram. Local files. Your data.
              </p>
            </div>
            <DownloadForm onSubmit={handleSubmit} loading={loading} error={error} />
          </div>
        ) : (
          <JobList jobs={jobs} onSelectJob={handleSelectJob} onOpenFolder={handleOpenFolder} />
        )}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <DependencyCheck />
      <DashboardContent />
      <About />
    </ToastProvider>
  );
}
