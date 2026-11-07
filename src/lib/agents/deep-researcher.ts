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
    // English stopwords
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'and',
    'or', 'if', 'because', 'until', 'while', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
    'says', 'said', 'amid', 'new', 'report', 'reports',
    // Spanish stopwords
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'por', 'para',
    'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde', 'contra', 'ante', 'bajo', 'tras',
    'durante', 'mediante', 'segun', 'según', 'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo',
    'donde', 'dónde', 'quien', 'quién', 'pero', 'mas', 'más', 'sino', 'aunque', 'porque', 'pues',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'esto',
    'eso', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'nuestro', 'nuestra', 'se', 'le', 'les', 'lo',
    'nos', 'me', 'te', 'ya', 'no', 'si', 'sí', 'tambien', 'también', 'solo', 'sólo', 'muy', 'tan',
    'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'cada',
    'ser', 'es', 'son', 'fue', 'fueron', 'era', 'eran', 'sea', 'sido', 'estar', 'está', 'están',
    'estuvo', 'haber', 'ha', 'han', 'había', 'hay', 'tener', 'tiene', 'tienen', 'tuvo', 'hacer',
    'hace', 'hizo', 'dice', 'dicen', 'dijo', 'asegura', 'afirma', 'anuncia', 'advierte', 'tras'
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
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
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

  const collectFromFeed = async (hl: string, ceid: string, target: CorroboratingSource[]) => {
    const gl = ceid.split(':')[0] || 'US';
    const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}+when:3d&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    try {
      const parsed = await parser.parseURL(searchUrl);
      const items = (parsed.items || []).slice(0, 8);
      for (const item of items) {
        if (target.length >= 4) break;
        let sourceName = 'International Outlet';
        let cleanHeadline = item.title || '';

        if (cleanHeadline.includes(' - ')) {
          const parts = cleanHeadline.split(' - ');
          sourceName = parts.pop()?.trim() || sourceName;
          cleanHeadline = parts.join(' - ').trim();
        }

        if (sourceName.toLowerCase() === primarySource.toLowerCase()) continue;
        if (target.some((c) => c.sourceName.toLowerCase() === sourceName.toLowerCase())) continue;

        target.push({
          sourceName,
          title: cleanHeadline,
          snippet: (item.contentSnippet || item.content || cleanHeadline).replace(/\s+/g, ' ').trim(),
          link: item.link || '',
        });
      }
    } catch (err: any) {
      console.warn('[DeepResearcher] Error tracking corroborating sources:', err?.message);
    }
  };

  const corroborating: CorroboratingSource[] = [];
  await collectFromFeed('en-US', 'US:en', corroborating);
  if (corroborating.length < 2) {
    await collectFromFeed('es-419', 'US:es-419', corroborating);
  }
  return corroborating;
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
