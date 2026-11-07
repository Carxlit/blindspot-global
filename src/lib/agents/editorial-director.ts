import { z } from 'zod';
import { RawArticle, EditorialCategory } from '@/types/news';

export interface EditorialBrief {
  category: EditorialCategory;
  headline: string;
  subHeadline: string;
  blindSpotAngle: string;
  geopoliticalImplication: string;
  urgencyScore: number;
}

export const EDITORIAL_CATEGORIES: EditorialCategory[] = [
  'GEOPOLITICS',
  'SECURITY & DEFENSE',
  'GLOBAL ECONOMY',
  'POWER & SOCIETY',
  'TECHNOLOGY & AI',
];

const fold = (s: string) => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z&]/g, '');

/**
 * Normalizes model output to one of the 5 core categories
 */
export function normalizeCategory(value: unknown, fallback: EditorialCategory = 'GEOPOLITICS'): EditorialCategory {
  const v = fold(String(value || '')).replace(/AND|Y/g, '&');
  const exact = EDITORIAL_CATEGORIES.find((c) => fold(c) === v);
  if (exact) return exact;
  if (v.includes('ECONOM') || v.includes('MARKET') || v.includes('FINANC')) return 'GLOBAL ECONOMY';
  if (v.includes('SECUR') || v.includes('DEFENS') || v.includes('MILIT') || v.includes('SEGUR')) return 'SECURITY & DEFENSE';
  if (v.includes('POWER') || v.includes('SOCIET') || v.includes('PODER') || v.includes('SOCIED')) return 'POWER & SOCIETY';
  if (v.includes('GEOPOL') || v.includes('WORLD') || v.includes('DIPLOM')) return 'GEOPOLITICS';
  if (v.includes('TECH') || v.includes('TECNO') || v.endsWith('&AI') || v.endsWith('&IA') || v === 'AI' || v === 'IA') return 'TECHNOLOGY & AI';
  return fallback;
}

/**
 * Normalizes urgency score to 60-99 scale
 */
export function normalizeUrgency(value: unknown, fallback = 80): number {
  let n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n > 0 && n <= 1) n *= 100;
  else if (n > 0 && n <= 10) n *= 10;
  else if (n > 100) n = 99;
  return Math.round(Math.min(99, Math.max(60, n)));
}

export const EditorialBriefSchema = z.object({
  category: z.string().describe(
    "One of: 'GEOPOLITICS', 'SECURITY & DEFENSE', 'GLOBAL ECONOMY', 'POWER & SOCIETY', 'TECHNOLOGY & AI'"
  ),
  headline: z.string().describe(
    'Rigorous press headline in English in ALL CAPS, 6 to 10 words. Direct to the facts, no exclamation marks or sensationalism. Always translate non-English headlines into English.'
  ),
  subHeadline: z.string().describe(
    'Journalistic subheadline in English of one or two full sentences with hard context and a verifiable fact from the dossier.'
  ),
  blindSpotAngle: z.string().describe(
    'The SPECIFIC "Blind Spot" of this story in English (2-3 sentences): strategic subtext, undisclosed interests, precedents, or second-order consequences mainstream coverage is missing. Never generic.'
  ),
  geopoliticalImplication: z.string().describe(
    'Direct implication in English: who gains power or capital, who bears the cost, and what shifts on the board.'
  ),
  urgencyScore: z.coerce.number().describe('Urgency and impact from 60 to 99 (integer).'),
});

export const DIRECTOR_SYSTEM_PROMPT = `ROLE 1 - EDITORIAL DIRECTOR of "Blindspot", an independent publication of journalistic intelligence, geopolitical analysis, and critical economics (inspired by the sharp prose of Foreign Affairs, Semafor, Axios, and seasoned foreign correspondence).

EDITORIAL PHILOSOPHY:
Mainstream outlets repeat official press releases. "Blindspot" uncovers what goes unsaid: second-order consequences, hidden financial or military incentives, and how the balance of power actually shifts.

VOICE:
- Mature, incisive, sober, and hyper-lucid tone. Zero diplomatic naivety.
- Muscular, precise sentences. Zero fluff or generic AI filler.
- FORBIDDEN: sirens (🚨, 🔴), exclamation marks, "Breaking News", "Shocking!", "An unexpected turn", "In an unprecedented move", "In an increasingly interconnected world...", "It is crucial to remember...".
- Allowed categories (pick exactly one):
  - 'GEOPOLITICS' (territorial disputes, hard diplomacy, alliances, elections with international impact)
  - 'SECURITY & DEFENSE' (armed forces, weaponry, intelligence, armed conflicts, state cyberattacks)
  - 'GLOBAL ECONOMY' (trade, tariffs, sovereign debt, central banks, energy, crypto, and markets)
  - 'TECHNOLOGY & AI' (AI models, semiconductors, digital sovereignty, quantum, Big Tech, cybersecurity)
  - 'POWER & SOCIETY' (institutional control, regulation, civil pressure, rights, surveillance)`;

const forbiddenFilter = /(🚨|🔴|📢|⚠️|\b(breaking\s*news|live\s*updates?|news\s*24\/7|urgent|alert|[úu]ltima\s*hora)\b:?)/gi;

/**
 * Normalizes model output into the final editorial brief
 */
export function finalizeBrief(raw: z.infer<typeof EditorialBriefSchema>, article: RawArticle): EditorialBrief {
  let headline = raw.headline.replace(forbiddenFilter, '').replace(/!/g, '').trim().toUpperCase();
  if (article.updateOf) {
    headline = headline.replace(/^(?:UPDATE|ACTUALIZACI[ÓO]N)\s*[:\-–—]?\s*/i, '').trim();
    headline = `UPDATE: ${headline}`;
  }
  return {
    category: normalizeCategory(raw.category, normalizeCategory(article.category)),
    headline,
    subHeadline: raw.subHeadline.replace(forbiddenFilter, '').trim(),
    blindSpotAngle: raw.blindSpotAngle.trim(),
    geopoliticalImplication: raw.geopoliticalImplication.trim(),
    urgencyScore: normalizeUrgency(raw.urgencyScore, article.urgencyScore || 80),
  };
}
