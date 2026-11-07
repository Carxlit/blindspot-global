import { z } from 'zod';

/**
 * Agent 3.5: Full Article Writer
 * Writes the long-form analytical piece published on the Blindspot website and linked from all social posts.
 */
export const ArticleSchema = z.object({
  title: z.string().describe('Article title in English in sentence case (not all caps), 8 to 14 words. Always translate non-English source titles into natural English.'),
  dek: z.string().describe('Two-sentence standfirst in English summarizing the event and the Blindspot angle.'),
  keyFacts: z.array(z.string()).describe('3 to 5 verifiable hard facts in English taken from the dossier (figures, dates, names). Never invent.'),
  sections: z
    .array(
      z.object({
        heading: z.string().describe('Section subheading in English'),
        paragraphs: z.array(z.string()).describe('1 to 3 paragraphs of journalistic prose in English'),
      })
    )
    .describe(
      'Between 4 and 5 sections in English in this order: "What Happened", "The Context", "The Blind Spot", "Winners and Losers", "What to Watch". You may rephrase the subheadings.'
    ),
  tags: z.array(z.string()).describe('3 to 6 short thematic tags in English, without #'),
});

export type ArticleDraft = z.infer<typeof ArticleSchema>;

export const ARTICLE_SYSTEM_PROMPT = `ROLE 3 - FULL ARTICLE WRITER for the "Blindspot" website.
- Between 550 and 900 words in total. Foreign correspondent prose: concrete, using names, figures, and dates from the dossier.
- Clearly separate FACTS (attributed to sources: "according to Reuters...") from Blindspot's ANALYSIS.
- Never invent direct quotes, figures, or statements. If a fact is not in the dossier, it does not exist.
- No AI clichés, no exclamation marks, no emojis.`;

export function finalizeArticle(raw: ArticleDraft): ArticleDraft {
  const sections = (raw.sections || [])
    .map((s) => ({ heading: s.heading.trim(), paragraphs: (s.paragraphs || []).map((p) => p.trim()).filter(Boolean) }))
    .filter((s) => s.heading && s.paragraphs.length > 0)
    .slice(0, 6);
  return {
    title: raw.title.trim(),
    dek: raw.dek.trim(),
    keyFacts: (raw.keyFacts || []).map((f) => f.trim()).filter(Boolean).slice(0, 6),
    sections,
    tags: (raw.tags || []).map((t) => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 6),
  };
}
