'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, PictureInPicture2, Settings,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface Quality { name: string; index: number; }

/**
 * Adaptive HLS player. Uses hls.js where MSE is available, falls back to native
 * HLS on Safari. Exposes play/pause, scrub, volume, speed, quality, PiP, fullscreen.
 */
export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [menu, setMenu] = useState<null | 'quality' | 'speed'>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualities(hls.levels.map((l, i) => ({ name: `${l.height}p`, index: i })));
      });
      return () => { hls.destroy(); hlsRef.current = null; };
    } else {
      video.src = src; // native HLS (Safari) or progressive mp4
    }
  }, [src]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  }, []);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrent(v.currentTime);
  };

  const changeSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s); setMenu(null);
  };

  const changeQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setCurrentQuality(index); setMenu(null);
  };

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current) videoRef.current.volume = val;
    setVolume(val); setMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) wrapRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePip = async () => {
    const v = videoRef.current; if (!v) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await v.requestPictureInPicture();
  };

  return (
    <div ref={wrapRef} className="relative rounded-2xl overflow-hidden bg-black aspect-video group">
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        onClick={togglePlay}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!playing && (
        <button onClick={togglePlay} className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/90 text-ink text-3xl grid place-items-center">
          <Play size={32} className="ml-1" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition">
        <input
          type="range" min={0} max={duration || 0} value={current} onChange={onSeek}
          className="w-full accent-brand h-1.5 mb-3 cursor-pointer"
        />
        <div className="flex items-center gap-4 text-white text-sm">
          <button onClick={togglePlay}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={onVolume} className="w-20 accent-white h-1" />
          </div>
          <span className="tabular-nums">{formatDuration(current)} / {formatDuration(duration)}</span>

          <div className="ml-auto flex items-center gap-3 relative">
            <button onClick={() => setMenu(menu === 'speed' ? null : 'speed')} className="px-2 py-0.5 rounded bg-white/15 text-xs">{speed}×</button>
            {qualities.length > 0 && (
              <button onClick={() => setMenu(menu === 'quality' ? null : 'quality')} className="px-2 py-0.5 rounded bg-white/15 text-xs flex items-center gap-1">
                <Settings size={12} /> {currentQuality === -1 ? 'Auto' : qualities.find((q) => q.index === currentQuality)?.name}
              </button>
            )}
            <button onClick={togglePip} title="Picture in picture"><PictureInPicture2 size={18} /></button>
            <button onClick={toggleFullscreen} title="Fullscreen"><Maximize size={18} /></button>

            {menu === 'speed' && (
              <div className="absolute bottom-10 right-0 w-28 rounded-lg bg-black/90 text-white text-xs py-2">
                {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                  <div key={s} onClick={() => changeSpeed(s)} className={`px-3 py-1.5 hover:bg-white/10 cursor-pointer ${s === speed ? 'text-brand' : ''}`}>{s}×</div>
                ))}
              </div>
            )}
            {menu === 'quality' && (
              <div className="absolute bottom-10 right-0 w-32 rounded-lg bg-black/90 text-white text-xs py-2">
                <div onClick={() => changeQuality(-1)} className={`px-3 py-1.5 hover:bg-white/10 cursor-pointer ${currentQuality === -1 ? 'text-brand' : ''}`}>Auto</div>
                {qualities.slice().reverse().map((q) => (
                  <div key={q.index} onClick={() => changeQuality(q.index)} className={`px-3 py-1.5 hover:bg-white/10 cursor-pointer ${q.index === currentQuality ? 'text-brand' : ''}`}>{q.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
