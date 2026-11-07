import Parser from 'rss-parser';
import { RawArticle, NewsVideo } from '@/types/news';
import { resolveGoogleNewsUrl } from '@/lib/news/article-image';
import { findNewsVideo } from '@/lib/news/news-video';

const parser = new Parser();

export interface CorroboratingSource {
  sourceName: string;
  title: string;
  snippet: string;
  link: string;
}

export interface ResearchDossier {
  primarySource: string;
  primaryHeadline: string;
  primaryFullText?: string;
  corroboratingSources: CorroboratingSource[];
  sourcesConsultedCount: number;
  sourcesList: string[];
  crossSourceSummary: string;
  video?: NewsVideo;
}

export function extractInvestigationKeywords(title: string): string {
  const clean = title
    .replace(/[.,:;¿?¡!'"“”«»()\[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopwords = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'and',
    'or', 'if', 'because', 'until', 'while', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
    'says', 'said', 'amid', 'new', 'report', 'reports'
  ]);

  const tokens = clean
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word.toLowerCase()));

  return tokens.slice(0, 5).join(' ');
}

export async function fetchFullArticleText(url: string): Promise<string> {
  return (await fetchArticlePage(url)).text;
}

export async function fetchArticlePage(url: string): Promise<{ text: string; html: string }> {
  if (!url || url.includes('news.google.com')) {
    return { text: '', html: '' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);
    if (!res.ok) return { text: '', html: '' };

    const html = await res.text();

    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    const paragraphs: string[] = [];
    const pRegex = /<p\b[^>]*>(.*?)<\/p>/gi;
    let match;

    while ((match = pRegex.exec(cleaned)) !== null) {
      const text = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 40 && !text.toLowerCase().includes('subscribe') && !text.toLowerCase().includes('cookies')) {
        paragraphs.push(text);
      }
    }

    return { text: paragraphs.slice(0, 15).join('\n\n'), html };
  } catch (err: any) {
    console.warn(`[DeepResearcher] Full text extraction unavailable for ${url}:`, err?.message);
    return { text: '', html: '' };
  }
}

export async function findCorroboratingCoverage(
  title: string,
  primarySource: string
): Promise<CorroboratingSource[]> {
  const keywords = extractInvestigationKeywords(title);
  if (!keywords) return [];

  const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}+when:3d&hl=en-US&gl=US&ceid=US:en`;

  try {
    const parsed = await parser.parseURL(searchUrl);
    const items = (parsed.items || []).slice(0, 8);
    const corroborating: CorroboratingSource[] = [];

    for (const item of items) {
      let sourceName = 'International Outlet';
      let cleanHeadline = item.title || '';

      if (cleanHeadline.includes(' - ')) {
        const parts = cleanHeadline.split(' - ');
        sourceName = parts.pop()?.trim() || sourceName;
        cleanHeadline = parts.join(' - ').trim();
      }

      if (sourceName.toLowerCase() === primarySource.toLowerCase()) {
        continue;
      }

      corroborating.push({
        sourceName,
        title: cleanHeadline,
        snippet: (item.contentSnippet || item.content || cleanHeadline).replace(/\s+/g, ' ').trim(),
        link: item.link || '',
      });

      if (corroborating.length >= 4) break;
    }

    return corroborating;
  } catch (err: any) {
    console.warn('[DeepResearcher] Error tracking corroborating sources:', err?.message);
    return [];
  }
}

export async function buildMultiSourceDossier(article: RawArticle): Promise<ResearchDossier> {
  console.log(`[DeepResearcher] Investigating cross-sources for: "${article.title.slice(0, 60)}..."`);

  let fullArticleText = '';
  let pageHtml = '';
  if (article.link) {
    const directUrl = await resolveGoogleNewsUrl(article.link);
    if (directUrl) ({ text: fullArticleText, html: pageHtml } = await fetchArticlePage(directUrl));
  }

  const video = await findNewsVideo(article.title, pageHtml ? [pageHtml] : []).catch(() => undefined);
  if (video) console.log(`[DeepResearcher] Story video found: "${video.title}" (${video.channel || 'YouTube'})`);

  const corroborating = await findCorroboratingCoverage(article.title, article.sourceName);

  const sourcesSet = new Set<string>([article.sourceName]);
  corroborating.forEach((c) => sourcesSet.add(c.sourceName));
  const sourcesList = Array.from(sourcesSet);

  const crossSummaries = corroborating.map((c) => `• ${c.sourceName}: "${c.title}" -> ${c.snippet}`).join('\n');

  const compiledBriefing = [
    `PRIMARY SOURCE: ${article.sourceName}`,
    fullArticleText ? `FULL EXTRACTED TEXT:\n${fullArticleText.slice(0, 4000)}...` : `ORIGIN SUMMARY: ${article.contentSnippet}`,
    corroborating.length > 0
      ? `CORROBORATING COVERAGE ACROSS OTHER OUTLETS (${corroborating.length} sources consulted):\n${crossSummaries}`
      : 'EXCLUSIVE OR DEVELOPING COVERAGE.',
  ].join('\n\n');

  console.log(`[DeepResearcher] Dossier completed with ${sourcesList.length} sources: [${sourcesList.join(', ')}]`);

  return {
    primarySource: article.sourceName,
    primaryHeadline: article.title,
    primaryFullText: fullArticleText || undefined,
    corroboratingSources: corroborating,
    sourcesConsultedCount: sourcesList.length,
    sourcesList,
    crossSourceSummary: compiledBriefing,
    video,
  };
}
