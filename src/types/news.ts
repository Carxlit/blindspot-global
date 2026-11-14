export type EditorialCategory =
  | 'GEOPOLITICS'
  | 'SECURITY & DEFENSE'
  | 'GLOBAL ECONOMY'
  | 'POWER & SOCIETY'
  | 'TECHNOLOGY & AI';

export type LegacyCategory =
  | 'mundo'
  | 'tecnologia'
  | 'deportes'
  | 'economia'
  | 'insolito'
  | 'seguridad';

export type NewsCategory = LegacyCategory | EditorialCategory | string;

export interface StoryUpdateInfo {
  id: string;
  slug: string;
  title: string;
  headline: string;
  summary: string;
  rawImageUrl?: string;
  publishedAt?: string;
  reason?: string;
}

export interface RawArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  sourceName: string;
  category: NewsCategory;
  imageUrl?: string;
  urgencyScore?: number;
  geopoliticalImpact?: number;
  coverageCount?: number;
  tier1?: boolean;
  video?: NewsVideo;
  updateOf?: string;
  updateOriginal?: StoryUpdateInfo;
}

export interface MultiPlatformCopies {
  facebook: string;
  telegram: string;
  linkedIn: string;
  bluesky: string;
  x?: string;
}

export interface ProcessedNews {
  id: string;
  originalUrl: string;
  originalTitle: string;
  sourceName: string;
  category: NewsCategory;
  urgencyScore: number;
  headline: string;
  subHeadline: string;
  blindSpotAngle?: string;
  facebookPost: string;
  xPost?: string;
  telegramPost?: string;
  linkedInPost?: string;
  blueskyPost?: string;
  copies?: MultiPlatformCopies;
  cardImageUrl?: string;
  instagramCardUrl?: string;
  reelCoverUrl?: string;
  videoScript?: VideoScript;
  rawImageUrl?: string;
  photoCredits?: string[];
  sourceVideo?: NewsVideo;
  instagramPermalink?: string;
  updateOf?: string;
  publishedAt?: string;
  facebookPostId?: string;
  telegramMessageId?: string;
  xTweetId?: string;
  linkedInPostId?: string;
  blueskyPostId?: string;
  article?: NewsArticle;
  articleUrl?: string;
  status: 'pending' | 'approved' | 'published' | 'rejected';
  createdAt: string;
}

export interface NewsArticle {
  slug: string;
  title: string;
  dek: string;
  keyFacts: string[];
  sections: { heading: string; paragraphs: string[] }[];
  tags: string[];
  sources: { name: string; title: string; url: string }[];
  wordCount: number;
}

export interface NewsVideo {
  provider: 'youtube';
  id: string;
  title: string;
  channel?: string;
  license?: 'cc-by';
}

export interface VideoScript {
  hook: string;
  beats: string[];
  close: string;
}

export interface ChannelSelection {
  facebook: boolean;
  telegram: boolean;
  bluesky: boolean;
  linkedIn: boolean;
  instagram?: boolean;
  facebookReel?: boolean;
  mastodon?: boolean;
  threads?: boolean;
  youtube?: boolean;
  twitter?: boolean;
}

export interface ChannelResult {
  success: boolean;
  simulated?: boolean;
  skipped?: boolean;
  error?: string;
}

export interface QueuedPublication {
  id: string;
  news: ProcessedNews;
  channels: ChannelSelection;
  customCopies?: {
    facebook?: string;
    twitter?: string;
    telegram?: string;
    linkedIn?: string;
    bluesky?: string;
  };
  scheduledFor: string;
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'expired';
  healAttempts?: number;
  isBreaking?: boolean;
  igDeferred?: boolean; // El Reel de Instagram ya se reprogramó una vez a la franja de audiencia (18:00–21:00 Bogotá)
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  publishedAt?: string;
  error?: string;
  results?: {
    facebook?: ChannelResult & { postId?: string };
    telegram?: ChannelResult & { messageId?: string };
    twitter?: ChannelResult & { tweetId?: string };
    linkedIn?: ChannelResult & { postId?: string };
    bluesky?: ChannelResult & { uri?: string };
    instagram?: ChannelResult & { mediaId?: string };
    facebookReel?: ChannelResult & { videoId?: string };
    mastodon?: ChannelResult & { url?: string };
    threads?: ChannelResult & { postId?: string };
    youtube?: ChannelResult & { url?: string };
  };
  createdAt: string;
}

export interface NewsConfig {
  autoPilot: boolean;
  checkIntervalMinutes: number;
  brandName: string;
  badgeText: string;
  badgeColor: string;
  selectedCategories: NewsCategory[];
  facebookPageId?: string;
  facebookAccessToken?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  xApiKey?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessSecret?: string;
  linkedInAccessToken?: string;
  linkedInOrganizationId?: string;
  blueskyHandle?: string;
  blueskyPassword?: string;
}
