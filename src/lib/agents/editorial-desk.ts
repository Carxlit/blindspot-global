import path from 'path';
import { z } from 'zod';
import { RawArticle, MultiPlatformCopies, NewsArticle, VideoScript, StoryUpdateInfo, ProcessedNews } from '@/types/news';
import { generateObjectWithFallback } from '@/lib/ai/gemini';
import { readJsonFile } from '@/lib/storage/json-store';
import type { ResearchDossier } from './deep-researcher';
import { EditorialBrief, EditorialBriefSchema, DIRECTOR_SYSTEM_PROMPT, finalizeBrief } from './editorial-director';
import { MultiPlatformCopySchema, COPYWRITER_SYSTEM_PROMPT, finalizeCopies } from './multi-platform-copywriter';
import { ArticleSchema, ARTICLE_SYSTEM_PROMPT, finalizeArticle } from './article-writer';

/** Reel script: each line is a scene and is narrated aloud (no dubious figures or obscure acronyms) */
const VideoScriptSchema = z.object({
  hook: z.string().describe('Opening hook sentence, max 14 words, no all-caps'),
  beats: z.array(z.string()).describe('3 short sentences (max 22 words each) with key facts and the blind spot'),
  close: z.string().describe('Closing line of max 14 words inviting viewers to read the full analysis at the link in bio'),
});

const DeskSchema = z.object({
  brief: EditorialBriefSchema,
  copies: MultiPlatformCopySchema,
  article: ArticleSchema,
  video: VideoScriptSchema,
});

export interface DeskOutput {
  brief: EditorialBrief;
  copies: MultiPlatformCopies;
  article: NewsArticle;
  video?: VideoScript;
}

const VIDEO_SYSTEM_PROMPT = `ROLE 4 - REEL SCRIPTWRITER ("video"): 25 to 40-second script for a narrated vertical video.
- "hook": open with the most surprising fact or the question nobody is asking. Never start with "In this story...".
- "beats":/exactly 3 sentences, one idea per sentence, clear spoken language; the last one reveals the blind spot.
- "close": invite viewers to read the full analysis at the link in our bio.
- FIGURES: if the dossier contains a real key figure (percentage, count, dollar amount), include it in ONE of the sentences using digits and the unit attached ("62%", "435 seats", "2.5 million people"): the video displays it in large type. Use ONLY figures present in the dossier; never invent or round on your own.
- Conversational, sharp human tone—like an informed analyst explaining the story to a friend: natural transitions ("here is the catch", "what nobody is talking about is"), zero press-release jargon.
- Write for the ear: short sentences, no parentheses, no URLs, no hashtags, no emojis, simple numbers.
- Impeccable capitalization and punctuation: sentence case, proper nouns capitalized. Never all-caps or all-lowercase.`;

function finalizeVideoScript(raw: any): VideoScript | undefined {
  const clean = (s: unknown) => {
    const t = typeof s === 'string' ? s.replace(/\s+/g, ' ').replace(/https?:\/\/\S+|#\w+/g, '').trim() : '';
    const cased = t.length > 12 && t === t.toLocaleUpperCase('en-US') ? t.toLocaleLowerCase('en-US') : t;
    return cased.replace(new RegExp('^([¿¡"«\']?)(\\p{Ll})', 'u'), (_m, p, c) => p + c.toLocaleUpperCase('en-US'));
  };
  const hook = clean(raw?.hook);
  const beats = (Array.isArray(raw?.beats) ? raw.beats : []).map(clean).filter(Boolean).slice(0, 3);
  const close = clean(raw?.close);
  return hook && beats.length >= 2 ? { hook, beats, close: close || 'Read the full analysis at the link in our bio.' } : undefined;
}

const SLUG_STOPWORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'that', 'this', 'its', 'update']);

/**
 * Short, readable slug for the article URL: title keywords + unique suffix
 */
export function buildSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => !SLUG_STOPWORDS.has(w))
    .slice(0, 6)
    .join('-');
  return `${base || 'story'}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Resolves the headline and summary of the original story when article.updateOf is present
 */
export function resolveUpdateOriginal(article: RawArticle): StoryUpdateInfo | undefined {
  if (article.updateOriginal) return article.updateOriginal;
  if (!article.updateOf) return undefined;
  const slug = article.updateOf;
  const queuePath = path.join(process.cwd(), 'storage', 'publication_queue.json');
  const queue = readJsonFile<any[]>(queuePath, []);
  for (const rawItem of queue) {
    const found: ProcessedNews | undefined = rawItem?.news || rawItem;
    if (found && (found.article?.slug === slug || found.id === slug || rawItem?.id === slug)) {
      return {
        id: found.id || rawItem?.id || slug,
        slug: found.article?.slug || slug,
        title: found.originalTitle || found.article?.title || found.headline,
        headline: found.headline || found.article?.title || found.originalTitle,
        summary: found.subHeadline || found.article?.dek || found.blindSpotAngle || '',
        rawImageUrl: found.rawImageUrl,
      };
    }
  }
  const sitePath = path.join(process.cwd(), 'storage', 'site_articles.json');
  const siteEntries = readJsonFile<Array<{ slug: string; headline?: string; title?: string; dek?: string }>>(sitePath, []);
  const siteFound = siteEntries.find((e) => e.slug === slug);
  if (siteFound) {
    return {
      id: siteFound.slug,
      slug: siteFound.slug,
      title: siteFound.title || siteFound.headline || slug,
      headline: siteFound.headline || siteFound.title || slug,
      summary: siteFound.dek || '',
    };
  }
  return undefined;
}

/**
 * Builds the user prompt for the Editorial Desk (including update context if applicable)
 */
export function buildEditorialDeskPrompt(article: RawArticle, dossier?: ResearchDossier): string {
  const researchContext = dossier?.crossSourceSummary || article.contentSnippet;
  const updateOriginal = resolveUpdateOriginal(article);
  const updateBlock = updateOriginal
    ? `\n\nUPDATE TO A STORY ALREADY PUBLISHED BY BLINDSPOT:
- Original slug: ${updateOriginal.slug}
- First story headline: "${updateOriginal.headline}"
- First story summary: "${updateOriginal.summary}"
MANDATORY EDITORIAL INSTRUCTION: we already covered the initial event; report ONLY what is new without repeating old background. The brief headline (brief.headline) MUST start with "UPDATE:".`
    : '';

  return `Story to cover:
Received headline: "${article.title}"
Primary source: ${article.sourceName}
Suggested radar category: ${article.category}
Origin URL: ${article.link}${updateBlock}

MULTI-SOURCE INVESTIGATION DOSSIER (${dossier?.sourcesConsultedCount || 1} sources: ${dossier?.sourcesList?.join(', ') || article.sourceName}):
${researchContext}`;
}

export async function runEditorialDesk(article: RawArticle, dossier?: ResearchDossier): Promise<DeskOutput> {
  const prompt = buildEditorialDeskPrompt(article, dossier);

  const raw = await generateObjectWithFallback({
    label: 'Editorial Desk',
    schema: DeskSchema,
    temperature: 0.7,
    system: [
      'You are the complete editorial desk of "Blindspot". In a single response, you produce four coherent deliverables: "brief" (Role 1), "copies" (Role 2), "article" (Role 3), and "video" (Role 4). The editorial headline from the brief is used across the social copies.',
      DIRECTOR_SYSTEM_PROMPT,
      COPYWRITER_SYSTEM_PROMPT,
      ARTICLE_SYSTEM_PROMPT,
      VIDEO_SYSTEM_PROMPT,
      'LANGUAGE: write EVERYTHING in clear, sharp International/American English (headline, copies, article, and video script), even if a source is in another language. GLOBAL ACCURACY RULE: use only facts, figures, and names present in the dossier. Analysis may be interpretive; facts are never invented.',
    ].join('\n\n'),
    prompt,
  });

  const brief = finalizeBrief(raw.brief, article);
  const copies = finalizeCopies(raw.copies);
  const draft = finalizeArticle(raw.article);

  const sources = [
    { name: article.sourceName, title: article.title, url: article.link },
    ...(dossier?.corroboratingSources || []).map((s) => ({ name: s.sourceName, title: s.title, url: s.link })),
  ].filter((s, i, arr) => s.url && arr.findIndex((o) => o.url === s.url) === i);

  const wordCount = [draft.dek, ...draft.sections.flatMap((s) => s.paragraphs)].join(' ').split(/\s+/).length;

  return {
    brief,
    copies,
    video: finalizeVideoScript(raw.video),
    article: {
      slug: buildSlug(draft.title || brief.headline),
      ...draft,
      title: draft.title || brief.headline,
      sources,
      wordCount,
    },
  };
}
