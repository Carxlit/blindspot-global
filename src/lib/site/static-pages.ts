import { SiteConfig } from './site-config';
import { SITE_NAME } from './templates';

export interface StaticPage {
  rel: string;
  title: string;
  description: string;
  updated?: string;
  bodyHtml: string;
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function getStaticPages(config: SiteConfig = {}): StaticPage[] {
  const email = config.contactEmail || '';
  const editor = `${SITE_NAME} Editorial Team`;
  const location = '';
  const updated = 'May 2026';

  const contactLine = email
    ? `<p>You can write to us at <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>`
    : `<p>You can contact the editorial team through our official social media channels linked in the footer of this site.</p>`;

  return [
    {
      rel: 'about/',
      title: 'About Us',
      description: `What ${SITE_NAME} is, our editorial approach, and how we produce each piece.`,
      updated,
      bodyHtml: `
<p><strong>${SITE_NAME}</strong> is an independent international analysis publication in English. We cover geopolitics, global economy, security, technology, and power dynamics with a clear focus: explaining <em>what mainstream coverage leaves out</em>—who benefits, what incentives drive decisions, and what historical precedents matter.</p>

<h2>How We Work</h2>
<ul>
  <li><strong>Verified primary sources:</strong> every article is built from news wires, international outlets, and public documents. All consulted sources are cited with direct links at the end of each article.</li>
  <li><strong>Synthesis &amp; context:</strong> we cross-reference coverage across multiple international outlets to separate confirmed facts from statements by interested parties and highlight the blind spot of each story.</li>
  <li><strong>Responsible use of technology:</strong> we use artificial intelligence tools to assist in monitoring sources, cross-referencing information, and drafting, always anchored solely to facts present in the cited sources.</li>
  <li><strong>Corrections:</strong> if you detect an inaccurate figure or fact, let us know and we will review it immediately.</li>
</ul>

<h2>Editorial Responsibility</h2>
<p>Responsible party: <strong>${esc(editor)}</strong>${location ? ` (${esc(location)})` : ''}.</p>
${contactLine}`,
    },
    {
      rel: 'contact/',
      title: 'Contact',
      description: `Contact the ${SITE_NAME} editorial team: corrections, press inquiries, and questions.`,
      updated,
      bodyHtml: `
<p>For factual corrections, tips, press inquiries, or questions about privacy and advertising:</p>
${contactLine}
${
  config.socialLinks && Object.values(config.socialLinks).some(Boolean)
    ? `<h2>Official Channels</h2><ul>${Object.entries(config.socialLinks)
        .filter(([, u]) => u)
        .map(([k, u]) => `<li><strong>${esc(k)}:</strong> <a href="${esc(u)}" rel="noopener" target="_blank">${esc(u)}</a></li>`)
        .join('')}</ul>`
    : ''
}
<p>When writing to request a correction, please include the article link and the verifiable source supporting the correction.</p>`,
    },
    {
      rel: 'legal-notice/',
      title: 'Legal Notice',
      description: `Terms of use, intellectual property, and limitation of liability for ${SITE_NAME}.`,
      updated,
      bodyHtml: `
<h2>1. Publisher Identification</h2>
<p>Website: <strong>${SITE_NAME}</strong>. Editorial responsibility: <strong>${esc(editor)}</strong>${location ? `, ${esc(location)}` : ''}.</p>
${contactLine}

<h2>2. Purpose &amp; Terms of Use</h2>
<p>${SITE_NAME} publishes informational and analytical articles on international current affairs. Accessing and browsing the site is free and implies acceptance of this legal notice.</p>

<h2>3. Intellectual Property &amp; Sources</h2>
<p>The original analytical texts, design, and graphic pieces of ${SITE_NAME} belong to its publishers. Public events, data, and brief quotes come from the informational sources linked in each article, whose rights belong to their respective owners.</p>

<h2>4. Limitation of Liability</h2>
<p>Content is informational and analytical in nature; it does not constitute financial, legal, or any other professional advice. ${SITE_NAME} is not responsible for the content of external sites linked as reference sources.</p>`,
    },
    {
      rel: 'privacy/',
      title: 'Privacy Policy',
      description: `How we handle personal data, cookies, and third-party services on ${SITE_NAME}.`,
      updated,
      bodyHtml: `
<h2>1. Data Controller</h2>
<p>Controller: <strong>${esc(editor)}</strong>${location ? ` (${esc(location)})` : ''}.</p>
${contactLine}

<h2>2. Data We Collect</h2>
<p>${SITE_NAME} is a static informational site: <strong>it has no user registration, comment forms, or own database of personal data</strong>.</p>
<ul>
  <li><strong>Technical browsing logs:</strong> our hosting provider (such as Cloudflare Pages or GitHub Pages) automatically records technical connection data (IP address, browser, date, and requested page) for security and content delivery purposes.</li>
  <li><strong>Direct communications:</strong> if you write to us by email or social media, we will use your message solely to respond to your inquiry.</li>
  <li><strong>Advertising and analytics (only with your consent):</strong> if third-party ads or audience measurement are active on the site, they are only loaded when you click "Accept" on the cookie notice.</li>
</ul>

<h2>3. Legal Basis</h2>
<p>Legitimate interest in site security and operation, and your explicit consent (Art. 6.1.a GDPR) for advertising and analytics cookies.</p>

<h2>4. Your Rights</h2>
<p>You may exercise your rights of access, rectification, deletion, opposition, and limitation of processing by writing to the contact channel indicated above, as well as withdraw your cookie consent at any time from the <a href="../cookies/">Cookie Policy</a> page.</p>`,
    },
    {
      rel: 'cookies/',
      title: 'Cookie Policy',
      description: `What cookies ${SITE_NAME} uses and how to change or withdraw your consent.`,
      updated,
      bodyHtml: `
<p>A cookie is a small file stored in your browser. ${SITE_NAME} keeps cookie usage to a minimum:</p>

<h2>1. Technical Storage (Necessary)</h2>
<ul>
  <li><code>pc-consent-v1</code> (in <code>localStorage</code>): remembers whether you accepted or rejected third-party cookies so we do not ask you on every page.</li>
</ul>

<h2>2. Advertising &amp; Analytics Cookies (Optional)</h2>
<p>To keep ${SITE_NAME} free and open-access, we may display ads served by third-party networks (such as Google AdSense, Monetag, or Adsterra) and measure aggregate audience. <strong>None of these scripts are loaded until you click "Accept".</strong> If you click "Reject", you can read the entire site without advertising or analytics cookies.</p>

<h2>3. Change Your Choice</h2>
<p>You can change or withdraw your consent right now:</p>
<p>
  <button type="button" onclick="try{localStorage.setItem('pc-consent-v1','no');location.reload()}catch(e){}">Reject third-party cookies</button>
  <button type="button" onclick="try{localStorage.removeItem('pc-consent-v1');location.reload()}catch(e){}">Ask me again</button>
</p>`,
    },
  ];
}
