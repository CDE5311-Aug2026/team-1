import type { CategoryId, Source } from './culture';

export interface Video {
  youtubeId: string;
  title: string; // exact YouTube title
  channel: string; // exact oEmbed author_name
  length: string; // like '2:05'
  sources: Source[]; // [{ label: <channel>, url: 'https://www.youtube.com/watch?v=<id>' }]
}

/** One official video per culture category. */
export const VIDEOS: Partial<Record<CategoryId, Video>> = {
  foods: {
    youtubeId: 'vkQhcnjDU3Y',
    title: 'Nasi Lemak',
    channel: 'Roots Sg',
    length: '3:39',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=vkQhcnjDU3Y' }],
  },
  monuments: {
    youtubeId: 'igzFYGklDJI',
    title: 'Our National Monuments',
    channel: 'Roots Sg',
    length: '1:58',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=igzFYGklDJI' }],
  },
  holidays: {
    youtubeId: 'DFkEZ8z4lmc',
    title: 'Chinese New Year',
    channel: 'Roots Sg',
    length: '3:34',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=DFkEZ8z4lmc' }],
  },
  unesco: {
    youtubeId: 'l1gcm8g5EHY',
    title: 'Hawker Culture in Singapore',
    channel: 'Roots Sg',
    length: '2:05',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=l1gcm8g5EHY' }],
  },
  ich: {
    youtubeId: 'yVeDqq5m3-M',
    title: 'Stewards of Intangible Cultural Heritage Award - Thow Kwang',
    channel: 'Roots Sg',
    length: '2:25',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=yVeDqq5m3-M' }],
  },
  history: {
    youtubeId: 'ZAVuE2Ehtp4',
    title: 'Roots.sg Presents: The Mythical Origins of Singapura',
    channel: 'Roots Sg',
    length: '3:49',
    sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=ZAVuE2Ehtp4' }],
  },
};
