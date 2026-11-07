/** Fixed menu sections (matching Editorial Director categories) */
export const SITE_CATEGORIES = [
  'GEOPOLITICS',
  'GLOBAL ECONOMY',
  'TECHNOLOGY & AI',
  'SECURITY & DEFENSE',
  'POWER & SOCIETY',
] as const;

export function categorySlug(category: string): string {
  return (
    String(category || 'general')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'general'
  );
}

export function categoryPath(category: string): string {
  return `category/${categorySlug(category)}/`;
}

const WORD_START = new RegExp('(^|\\s)(\\p{L})', 'gu');

/** Readable section title: "TECHNOLOGY & AI" -> "Technology & AI" */
export function categoryLabel(category: string): string {
  return String(category || 'General')
    .toLowerCase()
    .replace(WORD_START, (_m, sp: string, ch: string) => sp + ch.toUpperCase())
    .replace(/\b(Ai|Ia)\b/g, 'AI');
}
