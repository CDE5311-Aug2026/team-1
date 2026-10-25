import type { Source } from './culture';

export interface Video {
  youtubeId: string;
  title: string; // exact YouTube title (oEmbed)
  channel: string; // exact oEmbed author_name
  /** like '2:05'; left out when it could not be checked */
  length?: string;
  sources: Source[]; // [{ label: <channel>, url: 'https://www.youtube.com/watch?v=<id>' }]
}

const yt = (youtubeId: string, title: string, channel: string, length?: string): Video => ({
  youtubeId,
  title,
  channel,
  length,
  sources: [{ label: channel, url: `https://www.youtube.com/watch?v=${youtubeId}` }],
});

/**
 * One short video per Today article, about that article's own topic, from the National Heritage Board's Roots Sg
 * channel. An article without a checked video has none: its card shows only its photo.
 * Checked 22 Oct 2026: hawker culture, Chinese New Year and the Singapura legend with YouTube oEmbed (earlier);
 * chilli crab and dikir barat are the videos embedded on their own Roots.sg pages (title and channel from the
 * oEmbed data; their length could not be checked from here, so the cards show none).
 */
export const ARTICLE_VIDEOS: Partial<Record<string, Video>> = {
  'chilli-crab': yt('mJk6puL0_60', 'Chilli Crab', 'Roots Sg'),
  'lunar-new-year': yt('DFkEZ8z4lmc', 'Chinese New Year', 'Roots Sg', '3:34'),
  'hawker-culture': yt('l1gcm8g5EHY', 'Hawker Culture in Singapore', 'Roots Sg', '2:05'),
  'dikir-barat': yt('hstiS2Q8Q8k', 'Dikir Barat', 'Roots Sg'),
  // the Malay Annals' story of the island's renaming, which the article retells
  'temasek-singapura': yt('ZAVuE2Ehtp4', 'Roots.sg Presents: The Mythical Origins of Singapura', 'Roots Sg', '3:49'),
};
