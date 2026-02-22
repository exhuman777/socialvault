'use client';

import JobCard, { type JobData } from './JobCard';

interface JobListProps {
  jobs: JobData[];
  onSelectJob: (job: JobData) => void;
  onOpenFolder: (path: string) => void;
}

export default function JobList({ jobs, onSelectJob, onOpenFolder }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: '#1c1c21', color: '#555560' }}
        >
          ↓
        </div>
        <p className="text-sm" style={{ color: '#a1a1aa' }}>No downloads yet</p>
        <p className="mt-1 text-xs" style={{ color: '#555560' }}>
          Paste a TikTok or Instagram URL to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onSelect={onSelectJob} onOpenFolder={onOpenFolder} />
      ))}
    </div>
  );
}
