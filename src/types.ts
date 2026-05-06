export type MediaType = 'video' | 'playlist';

export type Format = {
  id: string;
  ext: string;
  resolution: string;
  fps?: number;
  filesize?: number;
  vcodec: string;
  acodec: string;
};

export type VideoInfo = {
  id: string;
  title: string;
  type: MediaType;
  formats: Format[];
  thumbnail?: string;
  duration?: number;
  entries?: VideoInfo[];
};


