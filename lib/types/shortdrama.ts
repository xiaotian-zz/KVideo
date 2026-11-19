export interface ShortDramaCategory {
  id: string;
  name: string;
}

export interface ShortDramaItem {
  id: string;
  title: string;
  cover: string;
  rate?: string;
  episodeCount?: number;
  remarks?: string;
}
