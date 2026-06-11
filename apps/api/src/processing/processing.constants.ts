export const QUEUE_NAMES = {
  IMAGE: 'image-processing',
  VIDEO: 'video-processing',
} as const;

export interface ProcessJobData {
  mediaId: string;
  storageKey: string;
  mime: string;
}

// allowed types + size caps
export const PHOTO_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff',
];
export const VIDEO_MIME = [
  'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm',
];

export const MAX_PHOTO_BYTES = 100 * 1024 * 1024;       // 100 MB
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;  // 5 GB

export const IMAGE_SIZES: Record<string, number> = {
  thumbnail: 320,
  small: 640,
  medium: 1280,
  large: 2048,
};

export const VIDEO_RENDITIONS = [
  { name: '360p', height: 360, bitrate: 800 },
  { name: '480p', height: 480, bitrate: 1400 },
  { name: '720p', height: 720, bitrate: 2800 },
  { name: '1080p', height: 1080, bitrate: 5000 },
  { name: '1440p', height: 1440, bitrate: 9000 },
  { name: '2160p', height: 2160, bitrate: 18000 },
];
