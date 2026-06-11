'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, Loader2, XCircle, Film, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface QueueItem {
  id: string;          // local id
  file: File;
  mediaId?: string;
  progress: number;    // 0-100 upload
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'failed';
  title: string;
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.tiff,.mp4,.mov,.mkv,.webm';

export default function StudioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!loading && !user) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const update = (id: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  /** Presign → PUT to storage with progress → complete → poll status. */
  const uploadOne = useCallback(async (item: QueueItem) => {
    try {
      update(item.id, { status: 'uploading' });
      const { mediaId, uploadUrl } = await api<{ mediaId: string; uploadUrl: string }>(
        '/media/upload/presign',
        { method: 'POST', body: JSON.stringify({ filename: item.file.name, mime: item.file.type, size: item.file.size }) },
      );
      update(item.id, { mediaId });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', item.file.type);
        xhr.upload.onprogress = (e) => e.lengthComputable && update(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(item.file);
      });

      update(item.id, { progress: 100, status: 'processing' });
      await api(`/media/${mediaId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ title: item.title, visibility: 'public' }),
      });

      // poll processing status
      const poll = setInterval(async () => {
        try {
          const { status } = await api<{ status: string }>(`/media/${mediaId}/status`, { auth: false });
          if (status === 'ready') { update(item.id, { status: 'ready' }); clearInterval(poll); }
          if (status === 'failed') { update(item.id, { status: 'failed' }); clearInterval(poll); }
        } catch { /* keep polling */ }
      }, 3000);
    } catch {
      update(item.id, { status: 'failed' });
    }
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.round(performance.now())}-${Math.random()}`,
      file, progress: 0, status: 'pending', title: file.name.replace(/\.[^.]+$/, ''),
    }));
    setQueue((q) => [...q, ...items]);
    items.forEach(uploadOne);
  }, [uploadOne]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  const statusIcon = (s: QueueItem['status']) => {
    if (s === 'ready') return <CheckCircle2 className="text-emerald-500" size={18} />;
    if (s === 'failed') return <XCircle className="text-red-500" size={18} />;
    return <Loader2 className="animate-spin text-brand" size={18} />;
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Upload Studio</h1>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center bg-white dark:bg-panel"
      >
        <UploadCloud className="mx-auto mb-3 text-brand" size={48} />
        <h2 className="text-xl font-bold">Drag &amp; drop media here</h2>
        <p className="text-slate-400 text-sm mt-1">JPG · PNG · WEBP · GIF · TIFF · MP4 · MOV · MKV · WEBM</p>
        <button onClick={() => inputRef.current?.click()} className="mt-4 px-6 h-11 rounded-full bg-brand hover:bg-brand-hover text-white font-semibold">Browse files</button>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {queue.length > 0 && (
        <>
          <h3 className="font-bold mt-8 mb-3">Upload Queue ({queue.length})</h3>
          <div className="space-y-3">
            {queue.map((it) => {
              const isVideo = /\.(mp4|mov|mkv|webm)$/i.test(it.file.name);
              return (
                <div key={it.id} className="rounded-xl bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-700 grid place-items-center">
                    {isVideo ? <Film size={20} /> : <ImageIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{it.title}</div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2">
                      <div className={`h-1.5 rounded-full ${it.status === 'ready' ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${it.status === 'processing' ? 100 : it.progress}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1 capitalize">{it.status}{it.status === 'uploading' && ` · ${it.progress}%`}</div>
                  </div>
                  {statusIcon(it.status)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
