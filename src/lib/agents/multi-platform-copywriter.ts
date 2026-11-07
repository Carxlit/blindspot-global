import { z } from 'zod';
import { MultiPlatformCopies } from '@/types/news';

export const MultiPlatformCopySchema = z.object({
  facebookPost: z.string().describe(
    'Facebook post in English: 2 to 3 paragraphs of incisive, contextual analysis with sharp, human prose. Close with a thought-provoking question that invites debate, followed by 3 thematic hashtags.'
  ),
  telegramPost: z.string().describe(
    'Telegram post in English: intelligence memo using ONLY <b> and <i> HTML tags. Open with the headline in <b>, followed by 3 bullets: • What happened, • Why it matters, • What is next.'
  ),
  linkedInPost: z.string().describe(
    'LinkedIn post in English: executive-level strategic analysis on economic repercussions, geopolitical risk, and supply chains. Sober prose, zero clichés. 3 hashtags at the end.'
  ),
  blueskyPost: z.string().describe(
    'Bluesky post in English: max 230 characters including hashtags (a link will be appended). Direct hook, revealing "blind spot" fact, and 2 hashtags: #Blindspot and one matching the category.'
  ),
});

export const COPYWRITER_SYSTEM_PROMPT = `ROLE 2 - OMNICHANNEL EDITOR of "Blindspot".

MISSION: write copy with PERSONALITY, JOURNALISTIC NERVE, AND A DISTINCTIVE VOICE. Nothing that reads like a press release or generic AI.

BLACKLIST (FORBIDDEN):
- "In an increasingly interconnected / complex world..."
- "It is crucial to reflect on...", "Without a doubt...", "This marks a turning point..."
- "As events unfold...", "In conclusion / Ultimately..."
- Childish engagement bait like "What do you think? Drop a comment below!"
- Siren or alarm emojis: 🚨, 🔴, ⚠️, 💥.

CHANNEL RULES:
1. FACEBOOK (informed debate community): start right at the core. Paragraph 1: the hard fact and official narrative. Paragraph 2: the critical fracture (the blind spot). Paragraph 3: an incisive question forcing a stance. 3 precise hashtags.
2. TELEGRAM (intelligence memo): ONLY <b> and <i> tags.
   <b>EDITORIAL HEADLINE</b>

   • <b>What happened:</b> 1 or 2 sentences with the hard fact
   • <b>Why it matters:</b> the underlying angle and real weight
   • <b>What is next:</b> the next move on the board
3. BLUESKY (micro-analysis): max 230 characters; the inconvenient fact or contradiction + 2 hashtags.
4. LINKEDIN (macro-strategic analysis): senior analyst tone; supply chains, country risk, institutional stability, capital flows, and regulatory implications.

HASHTAGS: matched to the category (not always #Geopolitics); always include #Blindspot.`;

const forbiddenFilter = /(🚨|🔴|📢|⚠️|\b(breaking\s*news|live\s*updates?|news\s*24\/7|[úu]ltima\s*hora)\b:?)/gi;

function cleanCopy(text: string): string {
  return text
    .replace(forbiddenFilter, '')
    .replace(/^[\s\|\:\-]+/, '')
    .trim();
}

export function finalizeCopies(raw: z.infer<typeof MultiPlatformCopySchema>): MultiPlatformCopies {
  return {
    facebook: cleanCopy(raw.facebookPost),
    telegram: cleanCopy(raw.telegramPost),
    bluesky: cleanCopy(raw.blueskyPost),
    linkedIn: cleanCopy(raw.linkedInPost),
  };
}
