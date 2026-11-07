import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import { RawArticle, EditorialCategory, StoryUpdateInfo } from '@/types/news';
import { readJsonFile, writeJsonFileAtomic, localDateKey } from '@/lib/storage/json-store';

const QUEUE_PATH = path.join(process.cwd(), 'storage', 'publication_queue.json');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['image', 'image'],
    ],
  },
});

export interface ExpandedFeedConfig {
  url: string;
  sourceName: string;
  category: EditorialCategory;
  weight: number;
}

/** Google News search as RSS feed (default US English) */
function gnews(query: string, hl = 'en-US', ceid = 'US:en'): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${ceid.split(':')[0]}&ceid=${ceid}`;
}

/**
 * International wire agencies and high-rigor global English outlets
 */
export const SCOUT_FEEDS: ExpandedFeedConfig[] = [
  // --- TECHNOLOGY & AI ---
  {
    url: 'https://news.google.com/rss/headlines/section/topic/SCITECH?hl=en-US&gl=US&ceid=US:en',
    sourceName: 'Google Tech & AI',
    category: 'TECHNOLOGY & AI',
    weight: 10,
  },
  { url: gnews('site:reuters.com technology OR AI OR chips when:1d'), sourceName: 'Reuters Technology', category: 'TECHNOLOGY & AI', weight: 10 },
  { url: 'https://techcrunch.com/feed/', sourceName: 'TechCrunch', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://www.theverge.com/rss/index.xml', sourceName: 'The Verge', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', sourceName: 'Ars Technica', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://www.wired.com/feed/rss', sourceName: 'Wired', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: gnews('OpenAI OR Anthropic OR Nvidia OR TSMC OR "Artificial Intelligence" when:1d'), sourceName: 'AI & Semiconductors Radar', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en', sourceName: 'Google Science', category: 'TECHNOLOGY & AI', weight: 7 },

  // --- GEOPOLITICS ---
  { url: gnews('site:reuters.com world when:1d'), sourceName: 'Reuters', category: 'GEOPOLITICS', weight: 10 },
  { url: gnews('site:apnews.com when:1d'), sourceName: 'Associated Press', category: 'GEOPOLITICS', weight: 10 },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News', category: 'GEOPOLITICS', weight: 10 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', sourceName: 'Al Jazeera', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://www.theguardian.com/world/rss', sourceName: 'The Guardian', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://feeds.npr.org/1004/rss.xml', sourceName: 'NPR', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://rss.dw.com/rdf/rss-en-all', sourceName: 'DW News', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.france24.com/en/rss', sourceName: 'France 24', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', sourceName: 'Euronews', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395986', sourceName: 'CNA (Asia)', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.scmp.com/rss/91/feed', sourceName: 'South China Morning Post', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.thehindu.com/news/international/feeder/default.rss', sourceName: 'The Hindu', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', sourceName: 'Google World News', category: 'GEOPOLITICS', weight: 9 },
  { url: gnews('China OR Japan OR India OR Taiwan OR Korea OR Philippines when:1d'), sourceName: 'Asia-Pacific Radar', category: 'GEOPOLITICS', weight: 8 },
  { url: gnews('Israel OR Iran OR Gaza OR Lebanon OR Syria OR Saudi Arabia when:1d'), sourceName: 'Middle East Radar', category: 'GEOPOLITICS', weight: 9 },
  { url: gnews('Ukraine OR Russia OR NATO OR "European Union" OR UK when:1d'), sourceName: 'Europe Radar', category: 'GEOPOLITICS', weight: 9 },
  { url: gnews('UN OR diplomacy OR sanctions OR summit OR treaty when:2d'), sourceName: 'Global Diplomacy Radar', category: 'GEOPOLITICS', weight: 8 },

  // --- GLOBAL ECONOMY ---
  { url: gnews('site:reuters.com business OR markets OR economy when:1d'), sourceName: 'Reuters Business', category: 'GLOBAL ECONOMY', weight: 10 },
  { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en', sourceName: 'Bloomberg / Global Markets', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', sourceName: 'CNBC', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://www.ecb.europa.eu/rss/press.html', sourceName: 'European Central Bank', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', sourceName: 'Federal Reserve', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: gnews('"Federal Reserve" OR ECB OR IMF OR "World Bank" OR OPEC OR tariffs OR inflation when:1d'), sourceName: 'Central Banks & Energy Radar', category: 'GLOBAL ECONOMY', weight: 9 },

  // --- SECURITY & DEFENSE ---
  { url: gnews('site:reuters.com defense OR military OR war when:1d'), sourceName: 'Reuters Defense', category: 'SECURITY & DEFENSE', weight: 10 },
  { url: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en', sourceName: 'Associated Press (US)', category: 'SECURITY & DEFENSE', weight: 9 },
  { url: gnews('NATO OR Pentagon OR Kremlin OR military OR missile OR defense when:1d'), sourceName: 'Defense & Alliances Radar', category: 'SECURITY & DEFENSE', weight: 9 },
  { url: gnews('cyberattack OR ransomware OR hack OR data breach OR intelligence when:2d'), sourceName: 'Cybersecurity Radar', category: 'SECURITY & DEFENSE', weight: 8 },

  // --- POWER & SOCIETY ---
  { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', sourceName: 'UN News', category: 'POWER & SOCIETY', weight: 9 },
  { url: 'https://www.africanews.com/feed/rss', sourceName: 'Africanews', category: 'POWER & SOCIETY', weight: 7 },
  { url: 'https://theconversation.com/us/articles.atom', sourceName: 'The Conversation', category: 'POWER & SOCIETY', weight: 8 },
  { url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom', sourceName: 'USGS Earthquakes', category: 'POWER & SOCIETY', weight: 10 },
  { url: gnews('"White House" OR Congress OR Senate OR "Supreme Court" when:1d'), sourceName: 'Washington Radar', category: 'POWER & SOCIETY', weight: 9 },
  { url: gnews('earthquake OR hurricane OR tsunami OR wildfire OR flood OR eruption when:1d'), sourceName: 'Global Disasters Radar', category: 'POWER & SOCIETY', weight: 9 },
  { url: gnews('outbreak OR epidemic OR pandemic OR WHO OR vaccine when:2d'), sourceName: 'Global Health Radar', category: 'POWER & SOCIETY', weight: 8 },
];

/** Severe events in headlines (deaths, disasters, war, coups, attacks) */
export const SEVERE_EVENT = new RegExp(
  '\\b(plane crash|crashes|killed|dead|dies|death toll|massacre|attack|earthquake|tsunami|hurricane|eruption|invasion|declares war|coup|explosion|hostages|bombing|assassination|shooting|' +
    'muertos?|fallecid|mueren|muri[oó]|masacre|atentado|terremoto|sismo|explosi[oó]n|bombardeo|rehenes)\\b',
  'i'
);

/** Novelty markers allowing an update to an already covered severe event */
export const UPDATE_NOVELTY_MARKERS = new RegExp(
  '\\b(death\\s+toll\\s+rises|toll\\s+rises|toll\\s+climbs|rises\\s+to|climbs\\s+to|identified|identifies|identify|victims|causes?|investigators|investigation|' +
    'black\\s+box|flight\\s+recorder|charged|arrested|sentenced|convicted|confirmed|confirms|reveals?|rescued|new\\s+details|preliminary\\s+report|survivors?|autopsy)\\b',
  'gi'
);

/** Tier-1 wire agencies and reference outlets */
export const TIER1_SOURCES = new RegExp(
  '^(reuters|associated press|ap news|ap|afp|bbc|bbc news|al jazeera|the guardian|the new york times|the washington post|cnn|dw|dw news|deutsche welle|france 24|bloomberg|cnbc|npr|usgs|un news|euronews)\\b',
  'i'
);

const HISTORY_PATH = path.join(process.cwd(), 'storage', 'news_history.json');

interface NewsHistoryData {
  seenUrls: string[];
  processedSignatures?: {
    title: string;
    normalizedTokens: string[];
    date: string;
  }[];
}

const stripAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function extractSemanticTokens(text: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'and',
    'or', 'if', 'because', 'until', 'while', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
    'says', 'said', 'amid', 'update', 'breaking'
  ]);

  return stripAccents(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30',
  forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000',
};

export function extractEventTokens(text: string): string[] {
  const words = stripAccents(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const tokens = new Set<string>();
  for (const w of words) {
    if (/^\d+$/.test(w)) { tokens.add(w); continue; }
    if (NUMBER_WORDS[w]) { tokens.add(NUMBER_WORDS[w]); continue; }
    const base = extractSemanticTokens(w)[0];
    if (base) tokens.add(base.length > 6 ? base.slice(0, 6) : base);
  }
  return Array.from(tokens);
}

export function isSameEvent(titleA: string, titleB: string): boolean {
  const a = extractEventTokens(titleA);
  const b = new Set(extractEventTokens(titleB));
  if (a.length < 3 || b.size < 3) return false;
  const shared = a.filter((t) => b.has(t)).length;
  const union = new Set([...a, ...Array.from(b)]).size;
  return shared / union >= 0.5 || (shared >= 3 && shared / Math.min(a.length, b.size) >= 0.5);
}

const SAME_EVENT_WINDOW_MS = 72 * 3_600_000;
const MIN_UPDATE_AGE_MS = 3 * 3_600_000;
const MAX_UPDATE_AGE_MS = 48 * 3_600_000;
const MAX_UPDATES_PER_DAY = 2;

function extractNumbers(text: string): string[] {
  const cleaned = stripAccents(text)
    .replace(/(\d)[.,](\d{3})\b/g, '$1$2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const nums: string[] = [];
  for (const w of cleaned) {
    if (/^\d+$/.test(w)) {
      const n = Number(w);
      if (n >= 2024 && n <= 2028) continue;
      nums.push(String(n));
    } else if (NUMBER_WORDS[w]) {
      nums.push(NUMBER_WORDS[w]);
    }
  }
  return Array.from(new Set(nums));
}

export function hasUpdateNovelty(
  candidateTitle: string,
  origTitlesText: string,
  origFullRefText?: string
): { novel: boolean; reason?: string } {
  const normOrig = stripAccents(origTitlesText);
  UPDATE_NOVELTY_MARKERS.lastIndex = 0;
  const matches = candidateTitle.match(UPDATE_NOVELTY_MARKERS) || [];
  for (const rawMatch of matches) {
    const cleanMatch = stripAccents(rawMatch.trim());
    const root = cleanMatch.slice(0, Math.min(6, cleanMatch.length));
    if (root && !normOrig.includes(root)) {
      return { novel: true, reason: `marker "${rawMatch.trim()}"` };
    }
  }

  const candNums = extractNumbers(candidateTitle);
  const origTitleNums = extractNumbers(origTitlesText);
  const origAllNums = new Set(extractNumbers(origFullRefText || origTitlesText));
  if (candNums.length > 0 && origTitleNums.length > 0) {
    const diff = candNums.find((n) => !origAllNums.has(n));
    if (diff) {
      return { novel: true, reason: `updated figure (${diff})` };
    }
  }

  return { novel: false };
}

const GENERIC_EVENT_TOKENS = new Set([
  'united', 'states', 'govern', 'presid', 'minist', 'police', 'forces', 'attack', 'crisis',
  'killed', 'people', 'countr', 'global', 'world', 'report', 'official', 'agency', 'alert',
]);

function matchesStoryCorpus(candidateTitle: string, storyTitles: string[]): boolean {
  const candSem = extractSemanticTokens(candidateTitle);
  for (const t of storyTitles) {
    if (!t) continue;
    if (calculateSemanticOverlap(candSem, extractSemanticTokens(t)) >= 0.50 || isSameEvent(candidateTitle, t)) {
      return true;
    }
  }
  const combinedTokens = new Set(extractEventTokens(storyTitles.join(' ')));
  const candEvent = extractEventTokens(candidateTitle);
  if (candEvent.length < 3 || combinedTokens.size < 3) return false;
  const shared = candEvent.filter((tok) => combinedTokens.has(tok));
  if (shared.length >= 3 && shared.length / candEvent.length >= 0.45) return true;

  const withoutNovelty = candidateTitle.replace(UPDATE_NOVELTY_MARKERS, ' ');
  const subjectTokens = extractEventTokens(withoutNovelty);
  const specificShared = shared.filter((tok) => !GENERIC_EVENT_TOKENS.has(tok));
  if (
    subjectTokens.length >= 2 &&
    shared.length >= 2 &&
    specificShared.length >= 2 &&
    shared.length / subjectTokens.length >= 0.6
  ) {
    return true;
  }
  return false;
}

export interface MatchUpdateOptions {
  now?: number;
  queue?: any[];
  matchedTitle?: string;
  alreadyUpdatedSlugs?: Set<string>;
  extraUpdatesToday?: number;
}

export function matchStoryUpdate(candidateTitle: string, opts: MatchUpdateOptions = {}): StoryUpdateInfo | null {
  const now = opts.now ?? Date.now();
  const queue = opts.queue ?? readJsonFile<any[]>(QUEUE_PATH, []);
  if (!Array.isArray(queue) || queue.length === 0) return null;

  const todayKey = localDateKey(new Date(now));
  const activeItems = queue.filter((item) => item && item.status !== 'expired' && item.status !== 'failed');

  const updatesToday =
    activeItems.filter(
      (item) => item.news?.updateOf && localDateKey(item.publishedAt || item.createdAt || new Date(now)) === todayKey
    ).length + (opts.extraUpdatesToday || 0);
  if (updatesToday >= MAX_UPDATES_PER_DAY) return null;

  const updatedSlugs = new Set<string>(opts.alreadyUpdatedSlugs || []);
  for (const item of activeItems) {
    if (item.news?.updateOf) updatedSlugs.add(item.news.updateOf);
  }

  for (const item of activeItems) {
    const news = item?.news;
    const slug = news?.article?.slug;
    if (!news || !slug || news.updateOf) continue;
    if (updatedSlugs.has(slug)) continue;

    const storyTitles = [news.originalTitle, news.headline, news.article?.title].filter(Boolean) as string[];
    const matchesByTitle =
      (opts.matchedTitle && storyTitles.some((t) => t.trim() === opts.matchedTitle!.trim())) ||
      matchesStoryCorpus(candidateTitle, storyTitles);
    if (!matchesByTitle) continue;

    const pubMs = new Date(item.publishedAt || news.publishedAt || item.createdAt).getTime();
    const createdMs = new Date(item.createdAt || item.publishedAt).getTime();
    const agePub = now - pubMs;
    const ageCreated = now - createdMs;
    const inWindow =
      (Number.isFinite(agePub) && agePub >= MIN_UPDATE_AGE_MS && agePub <= MAX_UPDATE_AGE_MS) ||
      (Number.isFinite(ageCreated) && ageCreated >= MIN_UPDATE_AGE_MS && ageCreated <= MAX_UPDATE_AGE_MS);
    if (!inWindow) continue;

    const origText = storyTitles.join(' ');
    const isSevereOrUrgent = SEVERE_EVENT.test(origText) || Boolean(item.isBreaking) || (news.urgencyScore || 0) >= 90;
    if (!isSevereOrUrgent) continue;

    const origTitlesText = [news.originalTitle, news.headline].filter(Boolean).join(' ');
    const origFullRefText = [news.originalTitle, news.headline, news.subHeadline, news.article?.title, news.article?.dek]
      .filter(Boolean)
      .join(' ');
    const novelty = hasUpdateNovelty(candidateTitle, origTitlesText, origFullRefText);
    if (!novelty.novel) continue;

    return {
      id: news.id,
      slug,
      title: news.article?.title || news.originalTitle || news.headline,
      headline: news.headline || news.originalTitle,
      summary: news.subHeadline || news.article?.dek || '',
      publishedAt: item.publishedAt || item.createdAt,
      reason: novelty.reason,
    };
  }

  return null;
}

export function calculateSemanticOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  Array.from(setA).forEach((token) => {
    if (setB.has(token)) intersection++;
  });
  const union = new Set(tokensA.concat(tokensB)).size;
  return union === 0 ? 0 : intersection / union;
}

export function getNewsHistory(): NewsHistoryData {
  try {
    if (!fs.existsSync(HISTORY_PATH)) {
      return { seenUrls: [], processedSignatures: [] };
    }
    const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return {
      seenUrls: data.seenUrls || [],
      processedSignatures: data.processedSignatures || [],
    };
  } catch {
    return { seenUrls: [], processedSignatures: [] };
  }
}

export function recordNewsInHistory(url: string, title: string) {
  try {
    const dir = path.dirname(HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const history = getNewsHistory();
    if (!history.seenUrls.includes(url)) {
      history.seenUrls.push(url);
    }

    const tokens = extractSemanticTokens(title);
    if (!history.processedSignatures) history.processedSignatures = [];

    history.processedSignatures.unshift({
      title,
      normalizedTokens: tokens,
      date: new Date().toISOString(),
    });

    if (history.seenUrls.length > 1000) {
      history.seenUrls = history.seenUrls.slice(-1000);
    }
    if (history.processedSignatures.length > 500) {
      history.processedSignatures = history.processedSignatures.slice(0, 500);
    }

    writeJsonFileAtomic(HISTORY_PATH, history);
  } catch (err) {
    console.error('[NewsScout] Error saving history:', err);
  }
}

export function markStoryAsCovered(url: string, titles: (string | undefined)[]) {
  const unique = Array.from(new Set(titles.filter((t): t is string => Boolean(t && t.trim()))));
  if (unique.length === 0) unique.push(url);
  unique.forEach((t) => recordNewsInHistory(url, t));
}

export function isDuplicateEvent(title: string, history: NewsHistoryData, opts: MatchUpdateOptions = {}): boolean {
  const currentTokens = extractSemanticTokens(title);
  if (currentTokens.length < 3) return false;

  const now = opts.now ?? Date.now();
  let matchedDuplicate = false;

  for (const signature of history.processedSignatures || []) {
    const similarity = calculateSemanticOverlap(currentTokens, signature.normalizedTokens);
    if (similarity >= 0.50) {
      matchedDuplicate = true;
      break;
    }
    const age = now - new Date(signature.date).getTime();
    if (signature.title && (!Number.isFinite(age) || age <= SAME_EVENT_WINDOW_MS) && isSameEvent(title, signature.title)) {
      matchedDuplicate = true;
      break;
    }
  }

  if (!matchedDuplicate) {
    const queue = opts.queue ?? readJsonFile<any[]>(QUEUE_PATH, []);
    for (const item of Array.isArray(queue) ? queue : []) {
      const news = item?.news;
      if (!news) continue;
      const age = now - new Date(item.createdAt || item.publishedAt).getTime();
      if (Number.isFinite(age) && age <= SAME_EVENT_WINDOW_MS) {
        const storyTitles = [news.originalTitle, news.headline, news.article?.title].filter(Boolean) as string[];
        if (matchesStoryCorpus(title, storyTitles)) {
          matchedDuplicate = true;
          break;
        }
      }
    }
  }

  if (!matchedDuplicate) return false;
  return matchStoryUpdate(title, opts) === null;
}

function getQueueSignatures(): { urls: Set<string>; signatures: NonNullable<NewsHistoryData['processedSignatures']> } {
  const queue = readJsonFile<any[]>(QUEUE_PATH, []);
  const urls = new Set<string>();
  const signatures: NonNullable<NewsHistoryData['processedSignatures']> = [];
  for (const item of Array.isArray(queue) ? queue : []) {
    const news = item?.news;
    if (!news) continue;
    if (news.originalUrl) urls.add(news.originalUrl);
    for (const t of [news.originalTitle, news.headline]) {
      if (t) signatures.push({ title: t, normalizedTokens: extractSemanticTokens(t), date: item.createdAt });
    }
  }
  return { urls, signatures };
}

export function scoreNewsImpact(title: string, snippet: string, feedWeight: number): { urgency: number; geopoliticalImpact: number } {
  const text = ` ${stripAccents(`${title} ${snippet}`).replace(/[^a-z0-9\s]/g, ' ')} `;

  const highImpactKeywords = [
    'war', 'missile', 'strike', 'nuclear', 'sanctions', 'oil', 'central bank', 'tariffs', 'nato', 'kremlin', 'pentagon',
    'taiwan', 'coup', 'election', 'elections', 'crisis', 'inflation', 'federal reserve', 'imf', 'debt', 'sovereignty',
    'cyberattack', 'resigns', 'treaty', 'armed forces', 'invasion', 'ceasefire', 'artificial intelligence', 'openai',
    'nvidia', 'semiconductors', 'microchips', 'algorithm', 'tsmc', 'supercomputer', 'quantum', 'silicon valley',
    'deepfake', 'cybersecurity', 'espionage', 'monopoly', 'big tech', 'earthquake', 'tsunami', 'hurricane', 'outbreak',
    'pandemic', 'ebola', 'killed', 'death toll', 'explosion', 'hostages', 'shutdown', 'default', 'recession', 'emergency',
    'massacre'
  ];

  let matches = 0;
  for (const kw of highImpactKeywords) {
    if (text.includes(` ${stripAccents(kw)} `)) matches++;
  }

  const urgency = Math.min(99, Math.max(60, 65 + (matches * 4) + Math.round((feedWeight / 10) * 10)));
  const geopoliticalImpact = Math.min(99, Math.max(60, 60 + (matches * 5) + (feedWeight * 2)));

  return { urgency, geopoliticalImpact };
}

export async function runNewsScout(limitPerFeed: number = 3): Promise<RawArticle[]> {
  const baseHistory = getNewsHistory();
  const queued = getQueueSignatures();
  const queueItems = readJsonFile<any[]>(QUEUE_PATH, []);
  const history: NewsHistoryData = {
    seenUrls: baseHistory.seenUrls,
    processedSignatures: [...(baseHistory.processedSignatures || []), ...queued.signatures],
  };
  const seenSet = new Set([...history.seenUrls, ...Array.from(queued.urls)]);
  const candidates: RawArticle[] = [];

  const fetchSingleFeed = async (feed: ExpandedFeedConfig) => {
    try {
      const parsed = await Promise.race([
        parser.parseURL(feed.url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Feed timeout (10s)')), 10000)
        )
      ]);

      const items = (parsed.items || []).slice(0, limitPerFeed);
      const feedCandidates: RawArticle[] = [];

      for (const item of items) {
        const link = item.link || '';
        const title = (item.title || '').trim();

        if (!link || !title || seenSet.has(link)) {
          continue;
        }

        let cleanTitle = title;
        let sourceName = feed.sourceName;

        if (feed.url.includes('news.google.com') && title.includes(' - ')) {
          const parts = title.split(' - ');
          sourceName = parts.pop()?.trim() || feed.sourceName;
          cleanTitle = parts.join(' - ').trim();
        }

        if (isDuplicateEvent(cleanTitle, history, { queue: queueItems })) {
          continue;
        }
        const updateInfo = matchStoryUpdate(cleanTitle, { queue: queueItems });
        if (updateInfo) {
          console.log(`[NewsScout] UPDATE candidate for ${updateInfo.slug} (${updateInfo.reason}): "${cleanTitle}"`);
        }

        let imageUrl: string | undefined = undefined;
        if (item.enclosure?.url) {
          imageUrl = item.enclosure.url;
        } else if (item['mediaContent']?.$?.url) {
          imageUrl = item['mediaContent'].$.url;
        } else if (item['mediaThumbnail']?.$?.url) {
          imageUrl = item['mediaThumbnail'].$.url;
        } else if (item['image']?.url) {
          imageUrl = item['image'].url;
        }

        const snippet = item.contentSnippet || item.content || cleanTitle;
        const { urgency, geopoliticalImpact } = scoreNewsImpact(cleanTitle, snippet, feed.weight);

        feedCandidates.push({
          tier1: TIER1_SOURCES.test(sourceName.trim()),
          id: Math.random().toString(36).substring(2, 11),
          title: cleanTitle,
          link,
          pubDate: item.pubDate || new Date().toISOString(),
          contentSnippet: snippet,
          sourceName,
          category: feed.category,
          imageUrl,
          urgencyScore: urgency,
          geopoliticalImpact,
          ...(updateInfo ? { updateOf: updateInfo.slug, updateOriginal: updateInfo } : {}),
        });
      }

      return feedCandidates;
    } catch (err: any) {
      console.warn(`[NewsScout] Feed temporarily skipped (${feed.sourceName}):`, err?.message);
      return [];
    }
  };

  const results = await Promise.allSettled(SCOUT_FEEDS.map((feed) => fetchSingleFeed(feed)));

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      candidates.push(...res.value);
    }
  }

  candidates.sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0));
  const unique: RawArticle[] = [];
  const seenUpdateSlugs = new Set<string>();
  let updateCandidatesCount = 0;
  const existingUpdatesToday = queueItems.filter(
    (item) => item && item.status !== 'expired' && item.status !== 'failed' && item.news?.updateOf && localDateKey(item.publishedAt || item.createdAt) === localDateKey()
  ).length;

  for (const c of candidates) {
    const tokens = extractSemanticTokens(c.title);
    const match = unique.find(
      (u) =>
        (c.updateOf && u.updateOf === c.updateOf) ||
        calculateSemanticOverlap(tokens, extractSemanticTokens(u.title)) >= 0.5 ||
        isSameEvent(c.title, u.title)
    );
    if (match) {
      match.coverageCount = (match.coverageCount || 1) + 1;
      if (c.tier1) match.tier1 = true;
    } else {
      if (c.updateOf) {
        if (seenUpdateSlugs.has(c.updateOf) || existingUpdatesToday + updateCandidatesCount >= MAX_UPDATES_PER_DAY) {
          continue;
        }
        seenUpdateSlugs.add(c.updateOf);
        updateCandidatesCount++;
      }
      unique.push({ ...c, coverageCount: 1 });
    }
  }

  for (const u of unique) {
    const severe = SEVERE_EVENT.test(u.title);
    const bonus = Math.min(20, ((u.coverageCount || 1) - 1) * 7) + (severe ? 8 : 0) + (severe && u.tier1 ? 10 : 0);
    if (bonus > 0) u.urgencyScore = Math.min(99, (u.urgencyScore || 70) + bonus);
  }
  return unique;
}
