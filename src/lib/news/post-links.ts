import { ProcessedNews } from '@/types/news';
import { truncateGraphemes } from './bluesky-client';

const TRAILING_HASHTAGS = new RegExp('\\s+((?:#[\\p{L}\\p{N}_]+\\s*)+)$', 'u');

export function insertBeforeHashtags(text: string, line: string): string {
  const match = text.match(TRAILING_HASHTAGS);
  return match
    ? `${text.slice(0, match.index).trimEnd()}\n\n${line}\n\n${match[1].trim()}`
    : `${text.trimEnd()}\n\n${line}`;
}

export function withSourceCredit(text: string, sourceName?: string): string {
  if (!sourceName || /(?:source|fuente)\s*:/i.test(text)) return text;
  return insertBeforeHashtags(text, `Source: ${sourceName}`);
}

export function withArticleLink(news: ProcessedNews, url?: string): ProcessedNews {
  if (!url) return news;
  const line = `Full analysis: ${url}`;
  return {
    ...news,
    facebookPost: insertBeforeHashtags(news.facebookPost, line),
    linkedInPost: news.linkedInPost ? insertBeforeHashtags(news.linkedInPost, line) : news.linkedInPost,
  };
}

export function composeBlueskyText(base: string, url?: string): { text: string; link?: { display: string; url: string } } {
  const match = base.match(TRAILING_HASHTAGS);
  const body = match ? base.slice(0, match.index).trim() : base.trim();
  const tags = match ? match[1].trim() : '';

  let display = '';
  if (url) {
    const bare = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    display = bare.length > 34 ? `${bare.slice(0, 33)}…` : bare;
  }

  const tail = [tags, display].filter(Boolean).join('\n');
  const room = 300 - (tail ? Array.from(tail).length + 2 : 0);
  const text = tail ? `${truncateGraphemes(body, room)}\n\n${tail}` : truncateGraphemes(body, 300);
  return { text, link: url ? { display, url } : undefined };
}
