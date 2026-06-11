'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Image as ImageIcon, Film, FolderOpen, HardDrive, Upload, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatBytes, formatCount } from '@/lib/utils';

interface Stats {
  totalUsers: number; totalPhotos: number; totalVideos: number; totalAlbums: number;
  storageBytes: number; dailyUploads: number; dailyViews: number;
}
interface Analytics {
  uploads: { bucket: string; count: number }[];
  views: { bucket: string; count: number }[];
}

export default function AdminDashboard() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !hasRole('ADMIN', 'SUPER_ADMIN')) { router.push('/'); return; }
    api<Stats>('/admin/stats').then(setStats).catch(() => undefined);
    api<Analytics>('/admin/analytics?range=daily').then(setAnalytics).catch(() => undefined);
  }, [loading, user, hasRole, router]);

  if (!stats) return <div className="p-16 text-center text-slate-400">Loading dashboard…</div>;

  const widgets = [
    { label: 'Total Users', value: formatCount(stats.totalUsers), icon: Users },
    { label: 'Total Photos', value: formatCount(stats.totalPhotos), icon: ImageIcon },
    { label: 'Total Videos', value: formatCount(stats.totalVideos), icon: Film },
    { label: 'Total Albums', value: formatCount(stats.totalAlbums), icon: FolderOpen },
    { label: 'Storage Used', value: formatBytes(stats.storageBytes), icon: HardDrive },
    { label: 'Daily Uploads', value: formatCount(stats.dailyUploads), icon: Upload },
    { label: 'Daily Views', value: formatCount(stats.dailyViews), icon: Eye },
  ];

  const maxUploads = Math.max(1, ...(analytics?.uploads.map((u) => u.count) ?? [1]));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-slate-400 text-sm mb-8">Welcome back, {user?.displayName ?? user?.username}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {widgets.map((w) => (
          <div key={w.label} className="rounded-2xl bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 p-5">
            <w.icon className="text-brand mb-3" size={24} />
            <div className="text-2xl font-bold">{w.value}</div>
            <div className="text-sm text-slate-400">{w.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-bold mb-4">Uploads — last 30 days</h3>
        <div className="flex items-end gap-1.5 h-48">
          {(analytics?.uploads ?? []).map((u, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand to-fuchsia-500 min-h-[4px]"
              style={{ height: `${(u.count / maxUploads) * 100}%` }} title={`${u.count}`} />
          ))}
          {(!analytics || analytics.uploads.length === 0) && <p className="text-slate-400 text-sm">No upload data yet.</p>}
        </div>
      </div>
    </div>
  );
}
