export interface Item {
  id: string;
  title: string;
  type: 'book' | 'movie' | 'series';
  status: 'unwatched' | 'watched';
  matchStatus: 'matched' | 'pending' | 'unidentified' | 'failed';
  duration: number; // 分钟
  keyPoints: string[];
  reason: string;
  tags: string[];
  source?: {
    name: string;
    url: string;
  };
  links: {
    name: string;
    url: string;
  }[];
  createdat: number;
}

export type ItemType = 'all' | 'book' | 'movie' | 'series';
export type DurationFilter = 'all' | 'short' | 'medium' | 'long';
