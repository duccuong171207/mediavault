export interface MediaCard {
  id: string;
  type: 'photo' | 'video';
  title?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  durationSec?: number;
  viewCount: number;
  favoriteCount: number;
  thumbnailUrl: string | null;
  publishedAt?: string;
}

export interface MediaDetail extends MediaCard {
  description?: string;
  versions?: { rendition: string; url: string; bitrateKbps?: number }[];
  metadata?: {
    camera?: string; lens?: string; iso?: number; aperture?: string;
    shutter?: string; focalLength?: string; takenAt?: string;
    gpsLat?: number; gpsLng?: number; frameRate?: number; audioCodec?: string;
  };
  owner?: { username: string; displayName?: string; avatarUrl?: string };
  category?: string;
  tags?: string[];
}

export interface AuthUser {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  displayName?: string;
  avatarUrl?: string;
}

export interface Feed {
  items: MediaCard[];
  nextCursor: string | null;
}
