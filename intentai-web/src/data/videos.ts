import type { Source } from './culture';

export interface Video {
  youtubeId: string;
  title: string; // exact YouTube title (oEmbed)
  channel: string; // exact oEmbed author_name
  length: string; // like '2:05'
  sources: Source[]; // [{ label: <channel>, url: 'https://www.youtube.com/watch?v=<id>' }]
}

const yt = (youtubeId: string, title: string, channel: string, length: string): Video => ({
  youtubeId,
  title,
  channel,
  length,
  sources: [{ label: channel, url: `https://www.youtube.com/watch?v=${youtubeId}` }],
});

/**
 * One short video per Today article, about that article's own topic (official or reputable channels; checked with
 * YouTube oEmbed). An article without a good video has none: its card shows only its photo.
 */
export const ARTICLE_VIDEOS: Partial<Record<string, Video>> = {
  'hawker-culture': yt('l1gcm8g5EHY', 'Hawker Culture in Singapore', 'Roots Sg', '2:05'),
  'lunar-new-year': yt('DFkEZ8z4lmc', 'Chinese New Year', 'Roots Sg', '3:34'),
};
