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
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['image', 'image'],
    ],
  },
});

interface ExpandedFeedConfig {
  url: string;
  sourceName: string;
  category: EditorialCategory;
  weight: number;
}

const gnews = (q: string, hl = 'en-US', ceid = 'US:en') => {
  const gl = ceid.split(':')[0] || 'US';
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
};

export const SCOUT_FEEDS: ExpandedFeedConfig[] = [
  // ============================================================================
  // 1. GLOBAL TIER-1 WIRES & INTERNATIONAL REFERENCE (ENGLISH)
  // ============================================================================
  { url: gnews('site:reuters.com world when:1d'), sourceName: 'Reuters', category: 'GEOPOLITICS', weight: 10 },
  { url: gnews('site:apnews.com world OR international when:1d'), sourceName: 'Associated Press', category: 'GEOPOLITICS', weight: 10 },
  { url: gnews('site:apnews.com politics OR washington OR white house when:1d'), sourceName: 'AP Politics', category: 'POWER & SOCIETY', weight: 10 },
  { url: gnews('site:reuters.com business OR markets OR economy when:1d'), sourceName: 'Reuters Business', category: 'GLOBAL ECONOMY', weight: 10 },
  { url: gnews('site:apnews.com business OR economy OR markets when:1d'), sourceName: 'AP Business', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: gnews('site:reuters.com technology OR AI OR chips when:1d'), sourceName: 'Reuters Technology', category: 'TECHNOLOGY & AI', weight: 10 },
  { url: gnews('site:reuters.com defense OR military OR war when:1d'), sourceName: 'Reuters Defense', category: 'SECURITY & DEFENSE', weight: 10 },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', sourceName: 'BBC News', category: 'GEOPOLITICS', weight: 10 },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', sourceName: 'BBC Business', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', sourceName: 'BBC Technology', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', sourceName: 'BBC Science', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', sourceName: 'Al Jazeera', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://www.theguardian.com/world/rss', sourceName: 'The Guardian', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://www.theguardian.com/uk/technology/rss', sourceName: 'The Guardian Tech', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://www.theguardian.com/uk/business/rss', sourceName: 'The Guardian Business', category: 'GLOBAL ECONOMY', weight: 8 },
  { url: 'https://feeds.npr.org/1004/rss.xml', sourceName: 'NPR World', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://feeds.npr.org/1001/rss.xml', sourceName: 'NPR News', category: 'POWER & SOCIETY', weight: 8 },
  { url: 'https://www.pbs.org/newshour/feeds/rss/world', sourceName: 'PBS NewsHour', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://rss.dw.com/rdf/rss-en-all', sourceName: 'DW News', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.france24.com/en/rss', sourceName: 'France 24', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=news', sourceName: 'Euronews', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.politico.eu/feed/', sourceName: 'Politico Europe', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://rss.politico.com/politics-news.xml', sourceName: 'Politico US', category: 'POWER & SOCIETY', weight: 8 },
  { url: 'https://foreignpolicy.com/feed/', sourceName: 'Foreign Policy', category: 'GEOPOLITICS', weight: 9 },

  // ============================================================================
  // 2. REGIONAL ENGLISH OUTLETS (ASIA-PACIFIC, MIDDLE EAST, EASTERN EUROPE, AFRICA)
  // ============================================================================
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395986', sourceName: 'CNA (Asia)', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.scmp.com/rss/91/feed', sourceName: 'South China Morning Post', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.thehindu.com/news/international/feeder/default.rss', sourceName: 'The Hindu', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.japantimes.co.jp/feed/', sourceName: 'The Japan Times', category: 'GEOPOLITICS', weight: 8 },
  { url: gnews('site:asia.nikkei.com when:1d'), sourceName: 'Nikkei Asia', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: gnews('site:kyivindependent.com when:1d', 'en-US', 'US:en'), sourceName: 'The Kyiv Independent', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: gnews('site:timesofisrael.com when:1d', 'en-US', 'US:en'), sourceName: 'The Times of Israel', category: 'GEOPOLITICS', weight: 8 },
  { url: gnews('site:middleeasteye.net when:1d', 'en-US', 'US:en'), sourceName: 'Middle East Eye', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.africanews.com/feed/rss', sourceName: 'Africanews', category: 'POWER & SOCIETY', weight: 7 },

  // ============================================================================
  // 3. TECHNOLOGY, AI, SCIENCE, DEFENSE & CYBERSECURITY (ENGLISH)
  // ============================================================================
  { url: 'https://techcrunch.com/feed/', sourceName: 'TechCrunch', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://www.theverge.com/rss/index.xml', sourceName: 'The Verge', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', sourceName: 'Ars Technica', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://www.wired.com/feed/rss', sourceName: 'Wired', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://www.technologyreview.com/feed/', sourceName: 'MIT Technology Review', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: 'https://www.nature.com/nature.rss', sourceName: 'Nature', category: 'TECHNOLOGY & AI', weight: 8 },
  // Radar de caídas de servicios (2026-11-14): la caída global de Microsoft 365 del 12-nov tardó ~17 h en
  // entrar al radar porque ningún feed la traía y «outage» no sumaba urgencia. Estos dos radares la cazan.
  { url: gnews('microsoft OR azure OR outlook OR "office 365" outage OR down when:1d'), sourceName: 'Google News – Microsoft caídas', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: gnews('"outage" OR "service disruption" OR "global outage" technology when:1d'), sourceName: 'Google News – Caídas tecnológicas', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://www.bleepingcomputer.com/feed/', sourceName: 'BleepingComputer', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: 'https://feeds.feedburner.com/TheHackersNews', sourceName: 'The Hacker News', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: 'https://krebsonsecurity.com/feed/', sourceName: 'Krebs on Security', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: 'https://www.defenseone.com/rss/all/', sourceName: 'Defense One', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: 'https://warontherocks.com/feed/', sourceName: 'War on the Rocks', category: 'SECURITY & DEFENSE', weight: 8 },

  // ============================================================================
  // 4. GLOBAL ECONOMY, MARKETS & CENTRAL BANKS (ENGLISH)
  // ============================================================================
  { url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', sourceName: 'CNBC World', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', sourceName: 'CNBC Economy', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', sourceName: 'MarketWatch', category: 'GLOBAL ECONOMY', weight: 8 },
  { url: gnews('site:ft.com world OR economy OR markets when:1d'), sourceName: 'Financial Times', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: gnews('site:wsj.com economy OR markets OR world when:1d'), sourceName: 'Wall Street Journal', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://www.ecb.europa.eu/rss/press.html', sourceName: 'European Central Bank', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', sourceName: 'Federal Reserve', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', sourceName: 'UN News', category: 'POWER & SOCIETY', weight: 9 },
  { url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom', sourceName: 'USGS Earthquakes', category: 'POWER & SOCIETY', weight: 10 },

  // ============================================================================
  // 5. GLOBAL THEMATIC & REGIONAL RADARS (ENGLISH GOOGLE NEWS)
  // ============================================================================
  { url: gnews('OpenAI OR Anthropic OR Google DeepMind OR Nvidia OR TSMC OR semiconductor when:1d'), sourceName: 'AI & Chips Radar', category: 'TECHNOLOGY & AI', weight: 9 },
  { url: gnews('cyberattack OR ransomware OR data breach OR zero-day OR state hackers when:2d'), sourceName: 'Cybersecurity Radar', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: gnews('Pentagon OR NATO OR missile strike OR military exercises OR nuclear deterrence when:1d'), sourceName: 'Global Defense Radar', category: 'SECURITY & DEFENSE', weight: 9 },
  { url: gnews('China OR Japan OR India OR South Korea OR Taiwan OR Philippines when:1d'), sourceName: 'Asia-Pacific Radar', category: 'GEOPOLITICS', weight: 8 },
  { url: gnews('Israel OR Iran OR Gaza OR Lebanon OR Syria OR Yemen OR Saudi Arabia when:1d'), sourceName: 'Middle East Radar', category: 'GEOPOLITICS', weight: 9 },
  { url: gnews('Ukraine OR Russia OR NATO OR European Union OR United Kingdom when:1d'), sourceName: 'Europe & NATO Radar', category: 'GEOPOLITICS', weight: 9 },
  { url: gnews('Sudan OR Congo OR Nigeria OR Ethiopia OR Sahel OR South Africa when:2d'), sourceName: 'Africa Radar', category: 'POWER & SOCIETY', weight: 8 },
  { url: gnews('Brazil OR Mexico OR Argentina OR Colombia OR Venezuela OR Chile when:2d'), sourceName: 'Americas Radar', category: 'GEOPOLITICS', weight: 8 },
  { url: gnews('White House OR Congress OR Senate OR Supreme Court OR Justice Department when:1d'), sourceName: 'US Power Radar', category: 'POWER & SOCIETY', weight: 9 },
  { url: gnews('earthquake OR hurricane OR tsunami OR wildfire OR volcanic eruption OR plane crash when:1d'), sourceName: 'Global Disasters Radar', category: 'POWER & SOCIETY', weight: 9 },
  { url: gnews('outbreak OR epidemic OR pandemic OR WHO OR avian flu OR Ebola when:2d'), sourceName: 'Global Health Radar', category: 'POWER & SOCIETY', weight: 9 },
  { url: gnews('climate change OR heatwave OR drought OR COP OR emissions when:2d'), sourceName: 'Climate Radar', category: 'POWER & SOCIETY', weight: 7 },
  { url: gnews('Federal Reserve OR ECB OR IMF OR World Bank OR OPEC OR oil prices OR tariffs when:1d'), sourceName: 'Central Banks & Energy Radar', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en', sourceName: 'Google Science', category: 'TECHNOLOGY & AI', weight: 7 },

  // ============================================================================
  // 6. INTERNATIONAL & LATIN AMERICAN SPANISH FEEDS
  //    (Automatically translated and synthesized into English by the Editorial Desk)
  // ============================================================================
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada', sourceName: 'El País', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/america/portada', sourceName: 'El País América', category: 'POWER & SOCIETY', weight: 9 },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada', sourceName: 'El País Economía', category: 'GLOBAL ECONOMY', weight: 8 },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada', sourceName: 'El País Tecnología', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://feeds.bbci.co.uk/mundo/rss.xml', sourceName: 'BBC Mundo', category: 'GEOPOLITICS', weight: 9 },
  { url: 'https://rss.dw.com/rdf/rss-sp-all', sourceName: 'DW Español', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.france24.com/es/rss', sourceName: 'France 24 Español', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.rfi.fr/es/rss', sourceName: 'RFI Español', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://es.euronews.com/rss?format=mrss&level=theme&name=news', sourceName: 'Euronews Español', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.europapress.es/rss/rss.aspx?ch=00069', sourceName: 'Europa Press', category: 'GEOPOLITICS', weight: 8 },
  { url: 'https://www.infobae.com/arc/outboundfeeds/rss/', sourceName: 'Infobae', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/america/?outputType=xml', sourceName: 'Infobae América', category: 'POWER & SOCIETY', weight: 7 },
  { url: 'https://www.bloomberglinea.com/arc/outboundfeeds/rss/?outputType=xml', sourceName: 'Bloomberg Línea', category: 'GLOBAL ECONOMY', weight: 9 },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada', sourceName: 'Cinco Días', category: 'GLOBAL ECONOMY', weight: 8 },
  { url: 'https://e00-expansion.uecdn.es/rss/economia.xml', sourceName: 'Expansión', category: 'GLOBAL ECONOMY', weight: 8 },
  { url: 'https://www.xataka.com/feedburner.xml', sourceName: 'Xataka', category: 'TECHNOLOGY & AI', weight: 8 },
  { url: 'https://www.defensa.com/rss', sourceName: 'Defensa.com', category: 'SECURITY & DEFENSE', weight: 8 },
  { url: 'https://e00-elmundo.uecdn.es/elmundo/rss/internacional.xml', sourceName: 'El Mundo', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.lavanguardia.com/rss/internacional.xml', sourceName: 'La Vanguardia', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.eltiempo.com/rss/mundo.xml', sourceName: 'El Tiempo', category: 'POWER & SOCIETY', weight: 7 },
  { url: 'https://www.lasillavacia.com/feed/', sourceName: 'La Silla Vacía', category: 'POWER & SOCIETY', weight: 8 },
  { url: 'https://www.clarin.com/rss/mundo/', sourceName: 'Clarín', category: 'POWER & SOCIETY', weight: 7 },
  { url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', sourceName: 'La Nación', category: 'GLOBAL ECONOMY', weight: 7 },
  { url: 'https://elcomercio.pe/arc/outboundfeeds/rss/category/mundo/?outputType=xml', sourceName: 'El Comercio', category: 'GEOPOLITICS', weight: 7 },
  { url: 'https://www.ciperchile.cl/feed/', sourceName: 'CIPER Chile', category: 'POWER & SOCIETY', weight: 8 },
  { url: gnews('México OR Brasil OR Argentina OR Colombia OR Venezuela OR Chile OR Perú OR Ecuador OR Cuba OR El Salvador when:1d', 'es-419', 'US:es-419'), sourceName: 'Latin America Radar', category: 'GEOPOLITICS', weight: 8 },
];

/** Severe events in the headline (deaths, disasters, war, coups, attacks), in English and Spanish */
export const SEVERE_EVENT = new RegExp(
  '\\b(plane crash|crashes|killed|kills|killing|gunman|dead|dies|death toll|massacre|terror attack|terrorist attack|attack|earthquake|tsunami|hurricane|eruption|invasion|declares war|coup|explosion|hostages|assassination|assassinated|shooting|airstrike|bombing|' +
    'muertos?|fallecid|mueren|muri[oó]|masacre|atentado|terremoto|sismo|tsunami|hurac[aá]n|erupci[oó]n|invasi[oó]n|declara la guerra|golpe de estado|explosi[oó]n|bombardeo|rehenes|se estrell[oó]|accidente a[eé]reo)\\b',
  'i'
);

/** Novelty markers that allow publishing an update to a previously covered severe story (English & Spanish) */
export const UPDATE_NOVELTY_MARKERS = new RegExp(
  '\\b(death\\s+toll\\s+rises|toll\\s+rises|toll\\s+climbs|rises\\s+to|climbs\\s+to|identified|identifies|identify|identity|identities|victims|causes?|investigators|investigation|black\\s+box|flight\\s+recorder|charged|indicted|arrested|detained|captured|sentenced|convicted|confirmed|confirms|new\\s+details|preliminary\\s+report|survivors?|autopsy|rescued|' +
    'identifican|identific[oó]|identificad[oa]s?|identidad(?:es)?|causas?|investigaci[oó]n|investigadores|investigan|peritajes?|caja\\s+negra|cajas\\s+negras|' +
    'balance|asciende(?:n)?|sube\\s+a|eleva(?:n)?\\s+a|aumenta(?:n)?\\s+a|v[ií]ctimas|arrestan|arrestad[oa]s?|detienen|detenid[oa]s?|capturan|capturad[oa]s?|' +
    'imputan|imputad[oa]s?|sentencian|sentenciad[oa]s?|condenan|condenad[oa]s?|confirman|confirmad[oa]s?|revelan|hallan|encuentran|rescatan|sobrevivientes?|' +
    'supervivientes?|autopsias?|informe\\s+preliminar|nuevos\\s+detalles)\\b',
  'gi'
);

/** Tier-1 wires and reference outlets (English & Spanish) */
export const TIER1_SOURCES = new RegExp(
  '^(reuters|associated press|ap news|ap|afp|efe|europa press|bbc|bbc news|bbc business|bbc technology|bbc science|bbc mundo|al jazeera|the guardian|the new york times|the washington post|financial times|the economist|wall street journal|wsj|cnbc|politico|foreign policy|cnn|cnn en espa[nñ]ol|dw|dw news|dw espa[nñ]ol|deutsche welle|france 24|rfi|el pa[ií]s|bloomberg|bloomberg l[ií]nea|npr|pbs|cna|south china morning post|scmp|kyiv independent|nikkei|the japan times|usgs|un news|noticias de la onu|euronews|federal reserve|european central bank|ecb)\\b',
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
    // English stopwords
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'have', 'more', 'will', 'about',
    'after', 'into', 'over', 'amid', 'says', 'said', 'are', 'was', 'were', 'has', 'had', 'not',
    'but', 'what', 'all', 'when', 'where', 'who', 'why', 'how', 'new', 'out', 'off', 'its', 'his',
    'her', 'their', 'our', 'can', 'may', 'just', 'now', 'than', 'then', 'also', 'been', 'being',
    'could', 'would', 'should', 'between', 'during', 'before', 'under', 'against', 'while',
    // Spanish stopwords
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
    'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o', 'este',
    'si', 'porque', 'esta', 'son', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene',
    'tambien', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante',
    'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'fueron', 'tras', 'dice', 'segun', 'ante'
  ]);

  return stripAccents(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

const NUMBER_WORDS: Record<string, string> = {
  // English
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30',
  forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000',
  // Spanish
  uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8',
  nueve: '9', diez: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15',
  dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20', treinta: '30',
  cuarenta: '40', cincuenta: '50', sesenta: '60', setenta: '70', ochenta: '80', noventa: '90',
  cien: '100', ciento: '100', mil: '1000',
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
  'estado', 'unidos', 'gobier', 'polici', 'fuerza', 'ataque', 'guerra', 'muerto', 'fallec',
  'accide', 'incend', 'explos', 'pais', 'paises', 'ciudad', 'mundo',
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


/**
 * Hechos graves en el mismo lugar con redacción distinta ("Five killed in armed attack in Krakow" vs
 * "Gunman kills six people in Polish city of Krakow"): comparten un nombre propio poco común y ambos son graves.
 * Solo dentro de 24 h del original; después hay que exigir novedad igualmente (la exige el llamador).
 */
function matchesSevereSamePlace(candidateTitle: string, storyTitles: string[], now: number, item: any): boolean {
  if (!SEVERE_EVENT.test(candidateTitle)) return false;
  const origText = storyTitles.join(' ');
  if (!SEVERE_EVENT.test(origText)) return false;
  const refMs = new Date(item.publishedAt || item.createdAt || 0).getTime();
  if (!Number.isFinite(refMs) || now - refMs > 24 * 3_600_000) return false;
  const specific = (text: string) =>
    new Set(extractEventTokens(text).filter((t) => t.length >= 5 && !/^\d+$/.test(t) && !GENERIC_EVENT_TOKENS.has(t) && !SEVERE_TOKEN_ROOTS.has(t)));
  const a = specific(candidateTitle);
  const b = specific(origText);
  return Array.from(a).some((t) => b.has(t));
}

const SEVERE_TOKEN_ROOTS = new Set([
  'killed', 'kills', 'killin', 'attack', 'people', 'deadly', 'shooti', 'gunman', 'police', 'wounde', 'injure',
  'armed', 'dozens', 'least', 'leaves', 'opens', 'fire', 'strike', 'airstr', 'explos', 'bombin', 'toll',
  'muerto', 'heridos', 'ataque', 'armado', 'deja',
]);

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
      matchesStoryCorpus(candidateTitle, storyTitles) ||
      matchesSevereSamePlace(candidateTitle, storyTitles, now, item);
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
    // English
    'war', 'missile', 'strike', 'nuclear', 'sanctions', 'oil', 'central bank', 'tariffs', 'nato', 'kremlin', 'pentagon',
    'taiwan', 'coup', 'election', 'elections', 'crisis', 'inflation', 'federal reserve', 'imf', 'debt', 'sovereignty',
    'cyberattack', 'resigns', 'treaty', 'armed forces', 'invasion', 'ceasefire', 'artificial intelligence', 'openai',
    'nvidia', 'semiconductors', 'microchips', 'algorithm', 'tsmc', 'supercomputer', 'quantum', 'silicon valley',
    'deepfake', 'cybersecurity', 'espionage', 'monopoly', 'big tech', 'earthquake', 'tsunami', 'hurricane', 'outbreak',
    'pandemic', 'ebola', 'killed', 'death toll', 'explosion', 'hostages', 'shutdown', 'default', 'recession', 'emergency',
    'massacre', 'assassination', 'indicted', 'supreme court',
    'outage', 'outages', 'downtime', 'service disruption', 'global outage', 'blackout', 'data breach', 'ransomware',
    // Spanish
    'guerra', 'misil', 'ataque', 'sanciones', 'petróleo', 'banco central', 'aranceles', 'otan', 'pentágono',
    'golpe de estado', 'elecciones', 'inflación', 'reserva federal', 'cepa', 'fmi', 'deuda', 'soberanía', 'ciberataque',
    'renuncia', 'tratado', 'fuerzas armadas', 'invasión', 'alto el fuego', 'inteligencia artificial', 'semiconductores',
    'algoritmo', 'supercomputadora', 'cuántica', 'ciberseguridad', 'espionaje digital', 'monopolio',
    'estado de emergencia', 'terremoto', 'huracán', 'brote', 'pandemia', 'muertos', 'masacre', 'rehenes', 'recesión',
    'apagón', 'caída del servicio', 'caída masiva', 'falla masiva', 'filtración de datos'
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

  // Redacción en inglés: los titulares en español solo entran si son importantes (hecho grave, urgencia alta o agencia de primer nivel)
  const SPANISH_TITLE = new RegExp('[áéíóúñ¿¡]|\\b(el|la|los|las|del|por|para|con|una|tras|sobre|ante|entre|segun|dice|gobierno|contra)\\b', 'i');
  for (let i = candidates.length - 1; i >= 0; i--) {
    const c = candidates[i];
    if (SPANISH_TITLE.test(c.title) && !(SEVERE_EVENT.test(c.title) || (c.urgencyScore || 0) >= 85 || c.tier1)) {
      candidates.splice(i, 1);
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
