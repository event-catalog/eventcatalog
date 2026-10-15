import { clientScript } from './client';
import { escapeHtml as e, highlight, highlightSource } from './highlight';
import { renderMarkdown, type ResolveLink } from './markdown';
import type {
  Attribute,
  AttributeVariant,
  CatalogModel,
  ChannelModel,
  DomainModel,
  DataStoreModel,
  EntityModel,
  FlowModel,
  MessageModel,
  MessageType,
  Owner,
  Ref,
  ServiceModel,
  SpecificationModel,
  SystemModel,
  TeamModel,
} from '../catalog/model';
import { eventCatalogFavicon, eventCatalogLogo } from './logo';
import { SPEC_ICONS } from './spec-icons';
import { attributesToTypeScript } from '../catalog/schema';
import { styles } from './styles';

const TYPE: Record<MessageType, { label: string; short: string; cls: string; plural: string; intro: string }> = {
  event: {
    label: 'Event',
    short: 'EVT',
    cls: 'evt',
    plural: 'Events',
    intro: 'Facts that happened. Published once, read by any number of consumers.',
  },
  command: {
    label: 'Command',
    short: 'CMD',
    cls: 'cmd',
    plural: 'Commands',
    intro: 'Requests for one service to do something. They can be rejected.',
  },
  query: {
    label: 'Query',
    short: 'QRY',
    cls: 'qry',
    plural: 'Queries',
    intro: 'Requests for information. They return data and change nothing.',
  },
};
const SPEC_TYPE_LABEL: Record<string, string> = { openapi: 'OpenAPI', asyncapi: 'AsyncAPI', graphql: 'GraphQL' };
const KIND_LABEL: Record<string, string> = {
  domain: 'Domain',
  service: 'Service',
  agent: 'Agent',
  channel: 'Channel',
  container: 'Data store',
  flow: 'Flow',
  entity: 'Entity',
  team: 'Team',
  user: 'Person',
};
/** Colour class per resource kind, matching EventCatalog's visualiser. */
const KIND_CLS: Record<string, string> = {
  event: 'evt',
  command: 'cmd',
  query: 'qry',
  domain: 'dom',
  system: 'sys',
  service: 'svc',
  agent: 'agt',
  flow: 'flw',
  entity: 'ent',
  channel: 'chn',
  container: 'dat',
};
const isMessage = (kind: string): kind is MessageType => kind === 'event' || kind === 'command' || kind === 'query';

const ICON = {
  close:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  download:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  warning:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  search:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  theme:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};

/** A link for http(s) URLs from the catalog; anything else (javascript:, data:, …) is shown as plain text. */
const externalLink = (url: string) => {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? `<a href="${e(trimmed)}" target="_blank" rel="noopener">${e(trimmed)}</a>` : e(trimmed);
};

const formatDate = (d: Date) => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const prettyJson = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text.trimEnd();
  }
};

interface CodeTab {
  label: string;
  code: string;
}

/**
 * Drops the indentation the templates above add, outside code and scripts. A newline is kept wherever whitespace
 * was, so nothing renders differently; on large catalogs this removes a large share of the file.
 */
const KEEP_AS_IS = ['pre', 'script', 'template', 'style'];
export const compactHtml = (html: string) => {
  // A single forward scan (no regex over the document), so the time stays linear whatever the content
  const lower = html.toLowerCase();
  const squeeze = (text: string) => text.replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n');
  // Next position of each tag, searched again only once the scan has passed it, so each is found in one pass
  const next = new Map(KEEP_AS_IS.map((name) => [name, lower.indexOf(`<${name}`)]));
  let out = '';
  let i = 0;
  while (i < html.length) {
    let start = -1;
    let tag = '';
    for (const name of KEEP_AS_IS) {
      let at = next.get(name)!;
      if (at !== -1 && at < i) next.set(name, (at = lower.indexOf(`<${name}`, i)));
      if (at !== -1 && (start === -1 || at < start)) {
        start = at;
        tag = name;
      }
    }
    if (start === -1) break;
    const close = lower.indexOf(`</${tag}>`, start);
    const end = close === -1 ? html.length : close + tag.length + 3;
    out += squeeze(html.slice(i, start)) + html.slice(start, end);
    i = end;
  }
  return out + squeeze(html.slice(i));
};

export interface RenderHtmlOptions {
  /** The command shown in the "Regenerate this reference" card. */
  regenerateCommand?: string;
}

const DEFAULT_REGENERATE_COMMAND = 'npx @eventcatalog/cli export --format html \\\n  --output architecture.html';

/**
 * Above this many sections the page stops drawing every section up front. Each one ships as inert text and is
 * drawn when it nears the screen, so a catalog with thousands of messages still opens in a moment.
 */
export const LAZY_SECTION_THRESHOLD = 400;

export const renderDocument = (model: CatalogModel, options: RenderHtmlOptions = {}): string => {
  const sectionCount =
    model.domains.length +
    model.systems.length +
    model.services.length +
    model.messages.length +
    model.channels.length +
    model.dataStores.length +
    model.flows.length +
    model.entities.length +
    model.teams.length +
    model.users.length;
  const lazySections = sectionCount > LAZY_SECTION_THRESHOLD;
  const domainOfService = new Map(model.services.map((s) => [s.id, s.domain]));
  const anchors = new Map<string, { name: string; anchor?: string }>();
  const register = (kind: string, r: { id: string; name: string; anchor: string }) => anchors.set(`${kind}:${r.id}`, r);
  model.domains.forEach((r) => register('domain', r));
  model.systems.forEach((r) => register('system', r));
  model.services.forEach((r) => register(r.kind, r));
  model.messages.forEach((r) => register(r.kind, r));
  model.channels.forEach((r) => register('channel', r));
  model.flows.forEach((r) => register('flow', r));
  model.entities.forEach((r) => register('entity', r));
  model.dataStores.forEach((r) => register('container', r));
  model.teams.forEach((r) => register('team', r));
  model.users.forEach((r) => register('user', r));

  const resolveLink: ResolveLink = (type, id) => {
    const kind = /^data-?stores?$/.test(type) ? 'container' : type === 'user' || type === 'team' ? type : type.replace(/s$/, '');
    return anchors.get(`${kind}:${id}`) || (kind === 'service' ? anchors.get(`agent:${id}`) : undefined);
  };
  const docs = (markdown: string) => {
    const html = renderMarkdown(markdown, resolveLink);
    return html ? `<div class="block"><div class="label">Documentation</div><div class="md">${html}</div></div>` : '';
  };

  // ---------- small building blocks ----------
  const link = (r: Ref, cls = '') =>
    r.anchor
      ? `<a${cls ? ` class="${cls}"` : ''} href="#${r.anchor}">${e(r.name)}</a>`
      : `<span${cls ? ` class="${cls}"` : ''}>${e(r.name)}</span>`;
  const msgLink = (r: Ref) => link(r, `msg-link ${isMessage(r.kind) ? TYPE[r.kind].cls : ''}`);
  const chip = (r: Ref, homeDomain?: string) => {
    let note = '';
    if (r.kind === 'agent' || r.kind === 'domain' || r.kind === 'system') note = KIND_LABEL[r.kind];
    else if (r.kind === 'service') {
      const d = domainOfService.get(r.id);
      if (d && d.id !== homeDomain) note = d.name;
    }
    const dot = KIND_CLS[r.kind] ? `<span class="dot ${KIND_CLS[r.kind]}"></span>` : '';
    const inner = `${dot}${e(r.name)}${note ? ` <small>${e(note)}</small>` : ''}`;
    return r.anchor ? `<a class="chip" href="#${r.anchor}">${inner}</a>` : `<span class="chip">${inner}</span>`;
  };
  const chips = (refs: Ref[], homeDomain?: string, empty = 'None in the catalog.') =>
    refs.length
      ? `<div class="chips">${refs.map((r) => chip(r, homeDomain)).join('')}</div>`
      : `<p class="empty">${e(empty)}</p>`;
  const owners = (list: Owner[]) =>
    list.length ? `<span>Owned by <b>${list.map((o) => link(o)).join(', ')}</b></span>` : '<span>No owner listed</span>';
  const pills = (r: { version?: string; badges: { content: string }[]; deprecated?: string | true; draft?: boolean }) =>
    [
      r.version ? `<span class="pill ver">v${e(r.version)}</span>` : '',
      r.deprecated ? '<span class="pill warn">Deprecated</span>' : '',
      r.draft ? '<span class="pill warn">Draft</span>' : '',
      ...r.badges.map((b) => `<span class="pill badge">${e(b.content)}</span>`),
    ].join('');
  const deprecation = (r: { deprecated?: string | true }) =>
    typeof r.deprecated === 'string'
      ? `<div class="callout warning">${ICON.warning}<div><b><span class="lvl">Deprecated</span></b>${e(r.deprecated)}</div></div>`
      : '';
  const eyebrow = (...parts: (string | undefined)[]) =>
    `<div class="eyebrow">${parts
      .filter(Boolean)
      .map((p, i) => (i ? `<span class="sep">/</span>${p}` : p))
      .join('')}</div>`;
  const lead = (text?: string) => (text ? `<p class="lead">${e(text)}</p>` : '');
  const idLine = (r: { id: string; name: string }) => (r.id !== r.name ? `<div class="res-id">${e(r.id)}</div>` : '');

  const constraintList = (items?: { label: string; value?: string }[]) =>
    items?.length
      ? `<div class="constraints">${items.map((c) => `<span>${e(c.label)}${c.value !== undefined ? ` <code>${e(c.value)}</code>` : ''}</span>`).join('')}</div>`
      : '';
  const variantList = (variants?: AttributeVariant[], variantType?: string) =>
    variants?.length
      ? `<div class="variants"><div class="variants-label">${variantType === 'anyOf' ? 'Any' : 'One'} of ${plural(variants.length, 'option')}</div>${variants
          .map(
            (v) =>
              `<div class="variant"><div class="attr-head"><span class="attr-name sans">${e(v.title)}</span></div>${v.description ? `<p class="attr-desc">${e(v.description)}</p>` : ''}${
                v.children.length
                  ? `<button class="child-toggle" aria-expanded="false"><span>Show child attributes</span></button><div class="children" hidden>${v.children.map(attrRow).join('')}</div>`
                  : ''
              }</div>`
          )
          .join('')}</div>`
      : '';
  function attrRow(a: Attribute): string {
    const type = a.format ? `${e(a.type)} <i>${e(a.format)}</i>` : e(a.type);
    const desc = [
      a.description ? e(a.description) : '',
      a.title ? `<span class="attr-title">${e(a.title)}</span>` : '',
      a.default !== undefined ? `<span>Defaults to <code>${e(a.default)}</code>.</span>` : '',
      a.example ? `<span>Example: <code>${e(a.example)}</code></span>` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<div class="attr">
      <div class="attr-head"><code class="attr-name">${e(a.name)}</code><span class="attr-type">${type}</span>${a.required ? '<span class="attr-req">Required</span>' : ''}${a.deprecated ? '<span class="attr-dep">Deprecated</span>' : ''}</div>
      ${desc ? `<p class="attr-desc">${desc}</p>` : ''}
      ${constraintList(a.constraints)}
      ${a.enum?.length ? `<div class="enum">${a.enum.map((v) => `<code>${e(v)}</code>`).join('')}</div>` : ''}
      ${a.children?.length ? `<button class="child-toggle" aria-expanded="false"><span>Show child attributes</span></button><div class="children" hidden>${a.children.map(attrRow).join('')}</div>` : ''}
      ${variantList(a.variants, a.variantType)}
    </div>`;
  }
  const termRow = (name: string, body?: string, id?: string) =>
    `<div class="attr"${id ? ` id="${id}"` : ''}><div class="attr-head"><span class="attr-name sans">${e(name)}</span></div>${body ? `<p class="attr-desc">${e(body)}</p>` : ''}</div>`;

  const codeCard = (tabs: CodeTab[], opts: { title?: string; foot?: string } = {}) => {
    if (!tabs.length) return '';
    const head =
      tabs.length > 1
        ? `<div class="tabs" role="tablist">${tabs.map((t, i) => `<button class="tab" role="tab" aria-selected="${i === 0}" data-i="${i}">${e(t.label)}</button>`).join('')}</div>`
        : `<span class="code-title">${e(opts.title || tabs[0].label)}</span>`;
    return `<div class="code"><div class="code-head">${head}<button class="copy" aria-label="Copy code">${ICON.copy}<span>Copy</span></button></div>${tabs
      .map((t, i) =>
        // Only the first tab is highlighted here. The others ship as plain text and are highlighted in the
        // browser when first opened (from the <template> after them), which keeps large catalogs small and fast to load.
        // Lazy sections are drawn by script anyway, so their first tab is highlighted when drawn as well
        i === 0 && !lazySections
          ? `<pre><code>${highlight(t.code)}</code></pre>`
          : `<pre${i ? ' hidden' : ''} data-lazy><code></code></pre><template>${t.code.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</template>`
      )
      .join('')}${opts.foot ? `<div class="code-foot">${opts.foot}</div>` : ''}</div>`;
  };
  /**
   * Specifications as a box of rows, each with its OpenAPI, AsyncAPI or GraphQL logo. Clicking a row opens the raw
   * file in the page's modal; its contents ship as plain text in the <template> after the row.
   */
  const specRowId = (anchor: string, i: number) => `spec-${anchor}-${i}`;
  const specBox = (anchor: string, specs: SpecificationModel[]) =>
    box(
      'Specifications',
      String(specs.length),
      specs
        .map((x, i) => {
          const icon = `<span class="spec-icon ${e(x.type)}"></span>`;
          const label = `<span class="spec-name">${e(x.name)}<small>${e(x.fileName)}</small></span>`;
          const type = `<span class="spec-type">${e(SPEC_TYPE_LABEL[x.type] || x.type)}</span>`;
          if (x.content === undefined)
            return `<div class="spec-row missing" title="The file could not be read">${icon}${label}${type}</div>`;
          const lang = /\.ya?ml$/i.test(x.fileName) ? 'yaml' : '';
          return `<button class="spec-row" id="${specRowId(anchor, i)}" type="button" data-file="${e(x.fileName)}" data-lang="${lang}" data-name="${e(x.name)}" data-type="${e(x.type)}">${icon}${label}${type}</button><template>${x.content.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</template>`;
        })
        .join('')
    );
  /** The same specifications as links with their logos, for the details on the left; each opens the modal. */
  const specLinks = (anchor: string, specs: SpecificationModel[]) =>
    specs.length
      ? `<div class="attr"><div class="attr-head"><span class="attr-name sans">Specifications</span></div><div class="spec-links">${specs
          .map((x, i) => {
            const inner = `<span class="spec-icon ${e(x.type)}"></span>${e(x.name)}<small>${e(SPEC_TYPE_LABEL[x.type] || x.type)}</small>`;
            return x.content === undefined
              ? `<span class="spec-link missing" title="The file could not be read">${inner}</span>`
              : `<button class="spec-link" type="button" data-open="${specRowId(anchor, i)}">${inner}</button>`;
          })
          .join('')}</div></div>`
      : '';
  const box = (title: string, meta: string, body: string, empty?: string) =>
    body || empty
      ? `<div class="box"><div class="box-head"><span>${e(title)}</span><span>${e(meta)}</span></div><div class="box-body">${body || `<p class="box-empty">${e(empty)}</p>`}</div></div>`
      : '';
  /** A short type tag, like Redoc's method chips, coloured by resource kind. */
  const tag = (text: string, cls: string) => `<span class="tag ${cls}">${e(text)}</span>`;
  const ep = (verb: string, cls: string, path: string, href?: string) =>
    href
      ? `<a class="ep" href="#${href}"><span class="ep-verb ${cls}">${e(verb)}</span><span class="ep-path">${path}</span></a>`
      : `<div class="ep"><span class="ep-verb ${cls}">${e(verb)}</span><span class="ep-path">${path}</span></div>`;
  const REF_TAG: Record<string, string> = {
    service: 'SVC',
    agent: 'AGENT',
    domain: 'DOM',
    system: 'SYS',
    container: 'DB',
    channel: 'CHN',
  };
  /** A box of related resources, one tagged row each, noting the domain when it differs from this one's. */
  const refBox = (title: string, refs: Ref[], homeDomain: string | undefined, empty: string) =>
    box(
      title,
      String(refs.length),
      refs
        .map((r) => {
          const d = r.kind === 'service' || r.kind === 'agent' ? domainOfService.get(r.id) : undefined;
          const note = d && d.id !== homeDomain ? `<small>${e(d.name)}</small>` : '';
          return ep(REF_TAG[r.kind] || r.kind.toUpperCase(), KIND_CLS[r.kind] || 'n', `${e(r.name)}${note}`, r.anchor);
        })
        .join(''),
      empty
    );
  const msgEp = (r: Ref) =>
    ep(isMessage(r.kind) ? TYPE[r.kind].short : '', isMessage(r.kind) ? TYPE[r.kind].cls : 'n', e(r.name), r.anchor);

  const section = (id: string, left: string, right: string, cls = '') => {
    const inner = `<div class="col-l">${left}</div><div class="col-r"><div class="sticky">${right}</div></div>`;
    if (!lazySections || cls === 'intro') return `<section class="section${cls ? ` ${cls}` : ''}" id="${id}">${inner}</section>`;
    // Inert until drawn: the browser keeps script text as one string instead of building its elements. The
    // placeholder's height is a rough estimate from the markup so the scrollbar and jumps stay close.
    const html = compactHtml(inner).replace(/<\/script/gi, '<\\/script');
    const estimate = Math.round(Math.min(4000, Math.max(320, html.length / 9)));
    return `<section class="section lazy${cls ? ` ${cls}` : ''}" id="${id}" style="height:${estimate}px"><script type="text/html">${html}</script></section>`;
  };
  const groupHead = (id: string, title: string, text: string) =>
    `<header class="group-head" id="${id}"><h2>${e(title)}</h2><p>${e(text)}</p></header>`;

  // ---------- overview ----------
  // "the Acme Inc EventCatalog", but not "the EventCatalog EventCatalog" for a catalog with no name of its own
  const catalogName = model.organization || model.title;
  const theCatalog = /eventcatalog$/i.test(catalogName) ? `the ${catalogName}` : `the ${catalogName} EventCatalog`;
  const counts = {
    domains: model.domains.length,
    systems: model.systems.length,
    services: model.services.length,
    event: model.messages.filter((m) => m.kind === 'event').length,
    command: model.messages.filter((m) => m.kind === 'command').length,
    query: model.messages.filter((m) => m.kind === 'query').length,
    channels: model.channels.length,
    dataStores: model.dataStores.length,
    flows: model.flows.length,
    teams: model.teams.length,
  };
  const listJoin = (parts: string[]) =>
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] || '';
  const count = (n: number, one: string, many?: string) => (n ? `<strong>${plural(n, one, many)}</strong>` : '');
  const messageCount = counts.event + counts.command + counts.query;
  const introSentence = (() => {
    const structure = [
      count(counts.domains, 'domain'),
      count(counts.systems, 'system'),
      count(counts.services, 'service'),
    ].filter(Boolean);
    const kinds = [
      plural(counts.event, 'event'),
      plural(counts.command, 'command'),
      plural(counts.query, 'query', 'queries'),
    ].filter((x) => !x.startsWith('0 '));
    const rest = [
      count(counts.channels, 'channel'),
      count(counts.dataStores, 'data store'),
      count(counts.flows, 'flow'),
      count(model.entities.length, 'entity', 'entities'),
    ].filter(Boolean);
    const parts = [
      ...(structure.length ? [listJoin(structure)] : []),
      ...(messageCount ? [`the ${count(messageCount, 'message')} they exchange (${listJoin(kinds)})`] : []),
      ...rest,
    ];
    const owners = counts.teams ? ` and the ${count(counts.teams, 'team')} that own them` : '';
    return parts.length ? `It documents ${listJoin(parts)}${owners}.` : '';
  })();
  const overview = section(
    'overview',
    `${eyebrow('<span>Architecture reference</span>', `<span>Generated ${e(formatDate(model.generatedAt))}</span>`)}
    <h1>${e(model.title)}</h1>
    ${lead(model.tagline)}
    <div class="prose">
      <p>This reference is generated from ${e(theCatalog)}. ${introSentence}</p>
      <p>Everything links to everything else. Press <kbd>⌘K</kbd> to jump to any resource.</p>
    </div>
`,
    `${box(
      'Catalog',
      formatDate(model.generatedAt).slice(0, 10),
      `<dl class="kv" style="padding:2px 0">${[
        ['Domains', counts.domains],
        ['Systems', counts.systems],
        ['Services', counts.services],
        ['Events', counts.event],
        ['Commands', counts.command],
        ['Queries', counts.query],
        ['Channels', counts.channels],
        ['Data stores', counts.dataStores],
        ['Flows', counts.flows],
        ['Teams', counts.teams],
      ]
        .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
        .join('')}</dl>`
    )}
    ${codeCard([{ label: 'Shell', code: options.regenerateCommand || DEFAULT_REGENERATE_COMMAND }], { title: 'Regenerate this reference' })}`,
    'intro'
  );

  // ---------- domains ----------
  const domainSection = (d: DomainModel) =>
    section(
      d.anchor,
      `${eyebrow('<span>Domain</span>', d.parent ? link(d.parent) : undefined)}
      <div class="title-row"><h2>${e(d.name)}</h2>${pills(d)}</div>
      ${idLine(d)}
      ${lead(d.summary)}
      <div class="meta-line">${owners(d.owners)}<span>${plural(d.services.length, 'service')}</span>${d.sends.length + d.receives.length ? `<span>${plural(d.sends.length + d.receives.length, 'integration event')}</span>` : ''}</div>
      ${deprecation(d)}
      ${d.specifications.length ? `<div class="block"><div class="label">Details</div>${specLinks(d.anchor, d.specifications)}</div>` : ''}
      ${d.ubiquitousLanguage.length ? `<div class="block"><div class="label">Ubiquitous language</div>${d.ubiquitousLanguage.map((u) => termRow(u.name, u.summary)).join('')}</div>` : ''}
      ${docs(d.markdown)}`,
      `${specBox(d.anchor, d.specifications)}
      ${box('Subdomains', String(d.subdomains.length), d.subdomains.map((x) => ep('DOM', 'dom', e(x.name), x.anchor)).join(''))}
      ${box('Systems', String(d.systems.length), d.systems.map((x) => ep('SYS', 'sys', e(x.name), x.anchor)).join(''))}
      ${box('Services', String(d.services.length), d.services.map((s) => ep(s.kind === 'agent' ? 'AGENT' : 'SVC', KIND_CLS[s.kind], e(s.name), s.anchor)).join(''))}
      ${box(
        'Integration events',
        String(d.sends.length + d.receives.length),
        `${d.sends.length ? `<div class="box-sub">Publishes</div>${d.sends.map(msgEp).join('')}` : ''}${d.receives.length ? `<div class="box-sub">Consumes</div>${d.receives.map(msgEp).join('')}` : ''}`
      )}
      ${box('Entities', String(d.entities.length), d.entities.map((x) => ep('ENTITY', 'ent', e(x.name), x.anchor)).join(''))}
      ${box('Flows', String(d.flows.length), d.flows.map((x) => ep('FLOW', 'flw', e(x.name), x.anchor)).join(''))}
      `
    );

  // ---------- systems ----------
  const systemSection = (x: SystemModel) =>
    section(
      x.anchor,
      `${eyebrow('<span>System</span>', x.domain ? link(x.domain) : undefined)}
      <div class="title-row"><h2>${e(x.name)}</h2>${x.scope === 'external' ? '<span class="pill warn">External</span>' : ''}${pills(x)}</div>
      ${idLine(x)}
      ${lead(x.summary)}
      <div class="meta-line">${owners(x.owners)}<span>${plural(x.services.length, 'service')}</span></div>
      ${deprecation(x)}
      ${x.relationships.length ? `<div class="block"><div class="label">Talks to</div>${x.relationships.map((r) => `<div class="attr"><div class="attr-head"><span class="attr-name sans">${link(r.ref)}</span></div>${r.label ? `<p class="attr-desc">${e(r.label)}</p>` : ''}</div>`).join('')}</div>` : ''}
      ${x.actors.length ? `<div class="block"><div class="label">Used by</div>${x.actors.map((a) => termRow(a.name, [a.direction === 'outbound' ? 'Receives from the system.' : a.direction === 'inbound' ? 'Uses the system.' : '', a.label || ''].filter(Boolean).join(' '))).join('')}</div>` : ''}
      ${docs(x.markdown)}`,
      `${box('Services', String(x.services.length), x.services.map((r) => ep(r.kind === 'agent' ? 'AGENT' : 'SVC', KIND_CLS[r.kind], e(r.name), r.anchor)).join(''))}
      ${box('Data', `${x.dataStores.length} stores`, x.dataStores.map((r) => ep('STORE', 'dat', e(r.name), r.anchor)).join(''))}
      ${box('Entities', String(x.entities.length), x.entities.map((r) => ep('ENTITY', 'ent', e(r.name), r.anchor)).join(''))}
      ${box('Flows', String(x.flows.length), x.flows.map((r) => ep('FLOW', 'flw', e(r.name), r.anchor)).join(''))}`
    );

  // ---------- services ----------
  const verb = (kind: MessageType, dir: 'send' | 'receive') => {
    if (kind === 'query') return dir === 'send' ? 'CALL' : 'ANSWER';
    if (dir === 'send') return kind === 'event' ? 'PUBLISH' : 'SEND';
    return kind === 'event' ? 'CONSUME' : 'HANDLE';
  };
  const serviceSection = (s: ServiceModel) => {
    const row = (l: ServiceModel['sends'][number], dir: 'send' | 'receive') => {
      const channel = l.channels[0];
      const pinned = l.pinnedVersion ? `<small>v${e(l.pinnedVersion)}</small>` : '';
      const path = `${e(l.message.name)}${pinned}${channel ? `<small>${e(channel.address || channel.name)}</small>` : ''}`;
      return ep(verb(l.message.kind, dir), TYPE[l.message.kind].cls, path, l.message.anchor);
    };
    const attrs = [
      s.repository?.language && termRow('Language', s.repository.language),
      s.repository?.url &&
        `<div class="attr"><div class="attr-head"><span class="attr-name sans">Repository</span></div><p class="attr-desc">${externalLink(s.repository.url)}</p></div>`,
      specLinks(s.anchor, s.specifications),
    ].filter(Boolean);
    return section(
      s.anchor,
      `${eyebrow(`<span>${KIND_LABEL[s.kind]}</span>`, s.domain ? link(s.domain) : undefined, s.system ? link(s.system) : undefined)}
      <div class="title-row"><h2>${e(s.name)}</h2>${pills(s)}</div>
      ${idLine(s)}
      ${lead(s.summary)}
      <div class="meta-line">${owners(s.owners)}<span>${s.sends.length} out · ${s.receives.length} in</span></div>
      ${deprecation(s)}
      ${attrs.length ? `<div class="block"><div class="label">Details</div>${attrs.join('')}</div>` : ''}
      ${docs(s.markdown)}`,
      `${specBox(s.anchor, s.specifications)}
      ${box(
        'Messages',
        `${s.sends.length} out · ${s.receives.length} in`,
        `${s.sends.length ? `<div class="box-sub">Sends</div>${s.sends.map((l) => row(l, 'send')).join('')}` : ''}${s.receives.length ? `<div class="box-sub">Receives</div>${s.receives.map((l) => row(l, 'receive')).join('')}` : ''}`
      )}
      ${refBox('Upstream', s.upstream, s.domain?.id, 'Nothing in the catalog sends it messages.')}
      ${refBox('Downstream', s.downstream, s.domain?.id, 'Nothing in the catalog consumes its output.')}
      ${box(
        'Data',
        `${s.writesTo.length + s.readsFrom.length} stores`,
        `${s.writesTo.map((r) => ep('WRITES', 'dat', e(r.name), r.anchor)).join('')}${s.readsFrom.map((r) => ep('READS', 'dat', e(r.name), r.anchor)).join('')}`
      )}
      `
    );
  };

  // ---------- messages ----------
  const messageSection = (m: MessageModel) => {
    const T = TYPE[m.kind];
    const labels =
      m.kind === 'event'
        ? ['Produced by', 'Consumed by']
        : m.kind === 'command'
          ? ['Sent by', 'Handled by']
          : ['Called by', 'Answered by'];
    const typePill = m.operation?.method ? `${m.operation.method} ${m.operation.path || ''}`.trim() : T.short;
    const schema = m.schema;
    const hasFields = Boolean(schema?.attributes.length || schema?.variants?.length);
    const attributes = hasFields
      ? `${schema?.description && schema.description !== m.summary ? `<p class="attr-desc schema-desc">${e(schema.description)}</p>` : ''}${schema!.attributes.map(attrRow).join('')}${variantList(schema!.variants, schema!.variantType)}`
      : `<p class="empty">${schema ? `The schema is ${e(schema.format)}. It is shown in full alongside.` : 'No schema is attached to this message in the catalog.'}</p>`;

    const tabs: CodeTab[] = [];
    m.examples
      .slice(0, 3)
      .forEach((x) => tabs.push({ label: m.examples.length > 1 ? x.fileName : 'Example', code: prettyJson(x.content) }));
    if (!m.examples.length && schema?.example !== undefined)
      tabs.push({ label: 'Example', code: JSON.stringify(schema.example, null, 2) });
    if (schema?.typescript) tabs.push({ label: 'TypeScript', code: schema.typescript });
    if (schema) tabs.push({ label: schema.fileName.split('/').pop() || 'Schema', code: schema.raw });

    const channelVerb = m.kind === 'event' ? 'PUBLISH' : m.kind === 'command' ? 'SEND' : 'QUERY';
    const routing = [
      m.operation?.method ? ep(m.operation.method, T.cls, e(m.operation.path || '/')) : '',
      ...m.channels.map((c) =>
        ep(
          channelVerb,
          T.cls,
          `${e(c.address || c.name)}${c.address && c.address !== c.name ? `<small>${e(c.name)}</small>` : ''}`,
          c.anchor
        )
      ),
    ].join('');

    return section(
      m.anchor,
      `${eyebrow(`<span>${T.label}</span>`, m.domain ? link(m.domain) : undefined)}
      <div class="title-row"><h2>${e(m.name)}</h2><span class="pill ${T.cls}">${e(typePill)}</span>${pills(m)}</div>
      ${idLine(m)}
      ${lead(m.summary)}
      <div class="meta-line">${owners(m.owners)}${schema?.attributes.length ? `<span>${plural(schema.attributes.length, 'attribute')}</span>` : ''}${schema && schema.format !== 'json-schema' ? `<span>${e(schema.format === 'avro' ? 'Avro' : schema.format === 'protobuf' ? 'Protobuf' : schema.format)} schema</span>` : ''}</div>
      ${deprecation(m)}
      <div class="block"><div class="label">Attributes</div>${attributes}</div>
      ${docs(m.markdown)}`,
      `${box(m.channels.length ? 'Channels' : 'Routing', m.channels.length ? plural(new Set(m.channels.map((c) => c.name)).size, 'channel') : m.operation?.method ? 'HTTP' : '', routing)}
      ${refBox(labels[0], m.producers, m.domain?.id, 'Nothing in the catalog.')}
      ${refBox(labels[1], m.consumers, m.domain?.id, 'Nothing in the catalog.')}
      ${codeCard(tabs)}`
    );
  };

  // ---------- channels ----------
  const messageByKey = new Map(model.messages.map((m) => [`${m.kind}:${m.id}`, m]));
  const channelSection = (c: ChannelModel) => {
    const rows = c.messages
      .map((r) => {
        const m = messageByKey.get(`${r.kind}:${r.id}`);
        const from = m?.producers.map((p) => link(p)).join(', ') || 'unknown';
        const to = m?.consumers.map((p) => link(p)).join(', ') || 'nobody yet';
        return `<div class="attr"><div class="attr-head">${msgLink(r)}<span class="attr-type">${isMessage(r.kind) ? TYPE[r.kind].label.toLowerCase() : ''}</span></div><p class="attr-desc">${from} → ${to}</p></div>`;
      })
      .join('');
    const kv = [
      c.address && ['Address', c.address],
      c.protocols.length && ['Protocols', c.protocols.join(', ')],
      c.deliveryGuarantee && ['Delivery', c.deliveryGuarantee],
      ['Messages', String(c.messages.length)],
    ].filter(Boolean) as string[][];
    return section(
      c.anchor,
      `${eyebrow('<span>Channel</span>', c.protocols.length ? `<span>${e(c.protocols.join(', '))}</span>` : undefined)}
      <div class="title-row"><h2>${e(c.name)}</h2>${pills(c)}</div>
      ${c.address ? `<div class="res-id">${e(c.address)}</div>` : idLine(c)}
      ${lead(c.summary)}
      <div class="meta-line">${owners(c.owners)}</div>
      ${deprecation(c)}
      ${c.parameters.length ? `<div class="block"><div class="label">Parameters</div>${c.parameters.map((p) => attrRow({ name: p.name, type: 'string', required: false, description: p.description, enum: p.enum, example: p.default })).join('')}</div>` : ''}
      <div class="block"><div class="label">Messages</div>${rows || '<p class="empty">No messages in the catalog use this channel.</p>'}</div>
      ${docs(c.markdown)}`,
      `${box('Channel', c.protocols[0] || '', `<dl class="kv" style="padding:2px 0">${kv.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>`)}
      ${refBox('Routed from', c.routedFrom, undefined, '')}
      ${refBox('Routes to', c.routesTo, undefined, '')}`
    );
  };

  // ---------- flows ----------
  const STEP_TAG: Record<string, string> = {
    ...REF_TAG,
    event: 'EVT',
    command: 'CMD',
    query: 'QRY',
    channel: 'CHN',
    flow: 'FLW',
    entity: 'ENT',
  };
  const flowSection = (f: FlowModel) => {
    // A timeline: each step carries its resource's tag and colour, joined by the transition that leads on.
    const steps = f.steps
      .map((s, i) => {
        const tagHtml = s.ref
          ? tag(STEP_TAG[s.ref.kind] || s.ref.kind.toUpperCase(), KIND_CLS[s.ref.kind] || 'n')
          : tag(s.actor ? 'ACTOR' : 'STEP', s.actor ? 'act' : 'n');
        const name = s.ref ? link(s.ref, 'flow-name') : `<span class="flow-name">${e(s.actor || s.title)}</span>`;
        const following = f.steps[i + 1]?.title;
        const next = s.next
          .map((n) => {
            const target = n.title === following && s.next.length === 1 ? '' : ` <b>→ ${e(n.title)}</b>`;
            return n.label || target ? `<span>${n.label ? e(n.label) : ''}${target}</span>` : '';
          })
          .filter(Boolean)
          .join('');
        return `<li>${tagHtml}<div class="flow-body">${name}${s.summary ? `<p class="attr-desc">${e(s.summary)}</p>` : ''}${next ? `<div class="flow-next">${next}</div>` : ''}</div></li>`;
      })
      .join('');
    const involved = [...new Map(f.steps.filter((s) => s.ref).map((s) => [`${s.ref!.kind}:${s.ref!.id}`, s.ref!])).values()];
    return section(
      f.anchor,
      `${eyebrow('<span>Flow</span>')}
      <div class="title-row"><h2>${e(f.name)}</h2>${pills(f)}</div>
      ${idLine(f)}
      ${lead(f.summary)}
      <div class="meta-line">${owners(f.owners)}<span>${plural(f.steps.length, 'step')}</span></div>
      ${deprecation(f)}
      <div class="block"><div class="label">Steps</div><ol class="flow">${steps}</ol></div>
      ${docs(f.markdown)}`,
      box(
        'In this flow',
        plural(involved.length, 'resource'),
        involved.map((r) => ep(STEP_TAG[r.kind] || r.kind.toUpperCase(), KIND_CLS[r.kind] || 'n', e(r.name), r.anchor)).join('')
      )
    );
  };

  // ---------- data stores ----------
  const dataStoreSection = (c: DataStoreModel) => {
    const kv = [
      ['Type', c.containerType],
      ['Technology', c.technology],
      ['Access', c.accessMode],
      ['Classification', c.classification],
      ['Residency', c.residency],
      ['Retention', c.retention],
      ['System of record', c.authoritative === undefined ? undefined : c.authoritative ? 'Yes' : 'No'],
    ].filter((row): row is [string, string] => Boolean(row[1]));
    return section(
      c.anchor,
      `${eyebrow('<span>Data store</span>', c.system ? link(c.system) : undefined)}
      <div class="title-row"><h2>${e(c.name)}</h2>${c.authoritative ? '<span class="pill badge">System of record</span>' : ''}${pills(c)}</div>
      ${idLine(c)}
      ${lead(c.summary)}
      <div class="meta-line">${owners(c.owners)}${c.technology ? `<span>${e(c.technology)}</span>` : ''}</div>
      ${deprecation(c)}
      ${c.purpose ? `<div class="block"><div class="label">Purpose</div><p class="attr-desc" style="padding-top:12px">${e(c.purpose)}</p></div>` : ''}
      ${docs(c.markdown)}`,
      `${
        kv.length
          ? box(
              'Data store',
              c.containerType || '',
              `<dl class="kv" style="padding:2px 0">${kv.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>`
            )
          : ''
      }
      ${refBox('Written by', c.writers, undefined, 'Nothing in the catalog writes to it.')}
      ${refBox('Read by', c.readers, undefined, 'Nothing in the catalog reads from it.')}`
    );
  };

  // ---------- entities ----------
  const entitySection = (x: EntityModel) =>
    section(
      x.anchor,
      `${eyebrow('<span>Entity</span>', x.domain ? link(x.domain) : undefined)}
      <div class="title-row"><h2>${e(x.name)}</h2>${x.aggregateRoot ? '<span class="pill badge">Aggregate Root</span>' : ''}${pills(x)}</div>
      ${idLine(x)}
      ${lead(x.summary)}
      <div class="meta-line">${owners(x.owners)}</div>
      ${deprecation(x)}
      <div class="block"><div class="label">Properties</div>${x.attributes.length ? x.attributes.map(attrRow).join('') : '<p class="empty">No properties listed.</p>'}</div>
      ${docs(x.markdown)}`,
      x.attributes.length ? codeCard([{ label: 'TypeScript', code: attributesToTypeScript(x.id, x.attributes, x.summary) }]) : ''
    );

  // ---------- teams and people ----------
  const OWNED_ORDER = [
    'domain',
    'system',
    'service',
    'agent',
    'event',
    'command',
    'query',
    'channel',
    'container',
    'flow',
    'entity',
  ];
  const OWNED_LABEL: Record<string, string> = {
    domain: 'Domains',
    system: 'Systems',
    service: 'Services',
    agent: 'Agents',
    event: 'Events',
    command: 'Commands',
    query: 'Queries',
    channel: 'Channels',
    container: 'Data stores',
    flow: 'Flows',
    entity: 'Entities',
  };
  const ownerSection = (t: TeamModel) => {
    const isTeam = t.kind === 'team';
    const contact = [
      t.email &&
        `<div class="attr"><div class="attr-head"><span class="attr-name sans">Email</span></div><p class="attr-desc"><code>${e(t.email)}</code></p></div>`,
      t.slack &&
        `<div class="attr"><div class="attr-head"><span class="attr-name sans">Slack</span></div><p class="attr-desc">${externalLink(t.slack)}</p></div>`,
    ].filter(Boolean);
    const owned = OWNED_ORDER.map((kind) => ({ kind, refs: t.owns.filter((r) => r.kind === kind) })).filter((g) => g.refs.length);
    const related = isTeam ? t.members : t.teams;
    return section(
      t.anchor,
      `${eyebrow(`<span>${isTeam ? 'Team' : 'Person'}</span>`)}
      <div class="title-row"><h2>${e(t.name)}</h2></div>
      ${idLine(t)}
      ${lead(isTeam ? t.summary : t.role)}
      <div class="meta-line"><span>Owns ${plural(t.owns.length, 'resource')}</span>${related.length ? `<span>${plural(related.length, isTeam ? 'member' : 'team')}</span>` : ''}</div>
      ${contact.length ? `<div class="block"><div class="label">Contact</div>${contact.join('')}</div>` : ''}`,
      `${box(
        isTeam ? 'Members' : 'Teams',
        String(related.length),
        related.map((r) => ep(isTeam ? 'USER' : 'TEAM', 'n', e(r.name), r.anchor)).join('')
      )}
      ${box(
        'Owns',
        String(t.owns.length),
        owned
          .map(
            (g) =>
              `<div class="box-sub">${OWNED_LABEL[g.kind]}</div>${g.refs.map((r) => ep(STEP_TAG[r.kind] || r.kind.toUpperCase(), KIND_CLS[r.kind] || 'n', e(r.name), r.anchor)).join('')}`
          )
          .join(''),
        'Nothing in the catalog lists them as an owner.'
      )}`
    );
  };

  // ---------- assemble ----------
  const messagesOf = (kind: MessageType) => model.messages.filter((m) => m.kind === kind);

  const main: string[] = [overview];
  if (model.domains.length)
    main.push(
      groupHead('domains', 'Domains', 'Business areas and the services and messages that belong to them.'),
      ...model.domains.map(domainSection)
    );
  if (model.systems.length)
    main.push(
      groupHead('systems', 'Systems', 'Groups of services that are built, deployed and owned together.'),
      ...model.systems.map(systemSection)
    );
  if (model.services.length)
    main.push(
      groupHead('services', 'Services', 'What runs, what it sends and what it listens to.'),
      ...model.services.map(serviceSection)
    );
  (['event', 'command', 'query'] as MessageType[]).forEach((kind) => {
    const list = messagesOf(kind);
    if (list.length)
      main.push(groupHead(TYPE[kind].plural.toLowerCase(), TYPE[kind].plural, TYPE[kind].intro), ...list.map(messageSection));
  });
  if (model.channels.length)
    main.push(
      groupHead('channels', 'Channels', 'Where messages travel: topics, queues and endpoints.'),
      ...model.channels.map(channelSection)
    );
  if (model.dataStores.length)
    main.push(
      groupHead('data-stores', 'Data stores', 'Where data lives: databases, caches, object stores and warehouses.'),
      ...model.dataStores.map(dataStoreSection)
    );
  if (model.flows.length)
    main.push(groupHead('flows', 'Flows', 'How the pieces work together, step by step.'), ...model.flows.map(flowSection));
  if (model.entities.length)
    main.push(groupHead('entities', 'Entities', 'The domain model behind the messages.'), ...model.entities.map(entitySection));
  if (model.teams.length)
    main.push(groupHead('teams', 'Teams', 'Who owns what, and how to reach them.'), ...model.teams.map(ownerSection));
  if (model.users.length)
    main.push(groupHead('people', 'People', 'Individual owners in the catalog.'), ...model.users.map(ownerSection));

  // ---------- nav ----------
  // Every item carries a short type tag, like Redoc's method chips, so the list scans at a glance.
  const navItem = (r: { anchor: string; name: string; id: string }, tagHtml: string) =>
    `<a class="item" href="#${r.anchor}" data-alt="${e(r.id.toLowerCase())}">${tagHtml}<span class="t">${e(r.name)}</span></a>`;
  const navGroup = (label: string, href: string, count: number, items: string) =>
    count
      ? `<div class="nav-group"><div class="nav-label"><a href="#${href}">${e(label)}</a><small>${count}</small></div>${items}</div>`
      : '';
  const navHtml = [
    `<div class="nav-group"><div class="nav-label">Overview</div><a class="item" href="#overview">${tag('DOC', 'n')}<span class="t">Introduction</span></a></div>`,
    navGroup('Domains', 'domains', model.domains.length, model.domains.map((d) => navItem(d, tag('DOM', 'dom'))).join('')),
    navGroup('Systems', 'systems', model.systems.length, model.systems.map((x) => navItem(x, tag('SYS', 'sys'))).join('')),
    navGroup(
      'Services',
      'services',
      model.services.length,
      model.services.map((s) => navItem(s, tag(s.kind === 'agent' ? 'AGT' : 'SVC', KIND_CLS[s.kind]))).join('')
    ),
    ...(['event', 'command', 'query'] as MessageType[]).map((kind) => {
      const list = messagesOf(kind);
      return navGroup(
        TYPE[kind].plural,
        TYPE[kind].plural.toLowerCase(),
        list.length,
        list.map((m) => navItem(m, tag(m.operation?.method || TYPE[kind].short, TYPE[kind].cls))).join('')
      );
    }),
    navGroup('Channels', 'channels', model.channels.length, model.channels.map((c) => navItem(c, tag('CHN', 'chn'))).join('')),
    navGroup(
      'Data stores',
      'data-stores',
      model.dataStores.length,
      model.dataStores.map((c) => navItem(c, tag('DB', 'dat'))).join('')
    ),
    navGroup('Flows', 'flows', model.flows.length, model.flows.map((f) => navItem(f, tag('FLW', 'flw'))).join('')),
    navGroup('Entities', 'entities', model.entities.length, model.entities.map((x) => navItem(x, tag('ENT', 'ent'))).join('')),
    navGroup('Teams', 'teams', model.teams.length, model.teams.map((t) => navItem(t, tag('TEAM', 'n'))).join('')),
    navGroup('People', 'people', model.users.length, model.users.map((u) => navItem(u, tag('USER', 'n'))).join('')),
  ].join('');

  // ---------- specification logos (only the types this catalog uses) ----------
  const specTypes = new Set([...model.services, ...model.domains].flatMap((r) => r.specifications.map((x) => x.type)));
  const specIconStyles = [...specTypes]
    .filter((type) => SPEC_ICONS[type])
    .map((type) => `.spec-icon.${type}{background-image:url("${SPEC_ICONS[type]}")}`)
    .join('');

  // ---------- search index ----------
  const index = [
    ...model.messages.map((m) => ({
      g: 'Messages',
      k: m.operation?.method || TYPE[m.kind].short,
      c: TYPE[m.kind].cls,
      t: m.name,
      a: m.id,
      s: m.summary || '',
      d: m.domain?.name || '',
      h: m.anchor,
    })),
    ...model.services.map((s) => ({
      g: 'Services',
      k: s.kind === 'agent' ? 'AGT' : 'SVC',
      c: KIND_CLS[s.kind],
      t: s.name,
      a: s.id,
      s: s.summary || '',
      d: s.domain?.name || '',
      h: s.anchor,
    })),
    ...model.domains.map((d) => ({
      g: 'Domains',
      k: 'DOM',
      c: 'dom',
      t: d.name,
      a: d.id,
      s: d.summary || '',
      d: d.parent?.name || '',
      h: d.anchor,
    })),
    ...model.systems.map((x) => ({
      g: 'Systems',
      k: 'SYS',
      c: 'sys',
      t: x.name,
      a: x.id,
      s: x.summary || '',
      d: x.domain?.name || '',
      h: x.anchor,
    })),
    ...model.channels.map((c) => ({
      g: 'Channels',
      k: 'CHN',
      c: 'chn',
      t: c.name,
      a: c.address || c.id,
      s: c.summary || '',
      d: c.protocols.join(', '),
      h: c.anchor,
    })),
    ...model.dataStores.map((c) => ({
      g: 'Data stores',
      k: 'DB',
      c: 'dat',
      t: c.name,
      a: c.id,
      s: c.summary || '',
      d: c.technology || '',
      h: c.anchor,
    })),
    ...model.flows.map((f) => ({ g: 'Flows', k: 'FLOW', c: 'flw', t: f.name, a: f.id, s: f.summary || '', d: '', h: f.anchor })),
    ...model.entities.map((x) => ({
      g: 'Entities',
      k: 'ENT',
      c: 'ent',
      t: x.name,
      a: x.id,
      s: x.summary || '',
      d: x.domain?.name || '',
      h: x.anchor,
    })),
    ...model.teams.map((t) => ({ g: 'Teams', k: 'TEAM', t: t.name, a: t.id, s: t.summary || '', d: '', h: t.anchor })),
    ...model.users.map((u) => ({ g: 'People', k: 'USER', t: u.name, a: u.id, s: u.role || '', d: '', h: u.anchor })),
  ];
  // Link previews (Slack, Teams, social): the catalog's name and what it documents, with EventCatalog's card image
  const pageTitle = `${model.title} · Architecture reference`;
  const pageDescription = `The architecture reference for ${theCatalog}. ${introSentence.replace(/<[^>]+>/g, '')}`.trim();
  const ogImage = 'https://www.eventcatalog.dev/img/opengraph.png';

  // Keep "</script>" sequences out of the inline JSON.
  const indexJson = JSON.stringify(index).replace(/</g, '\\u003c');

  return compactHtml(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="generator" content="EventCatalog">
<title>${e(pageTitle)}</title>
<meta name="description" content="${e(pageDescription)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${e(catalogName)}">
<meta property="og:title" content="${e(pageTitle)}">
<meta property="og:description" content="${e(pageDescription)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="EventCatalog">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(pageTitle)}">
<meta name="twitter:description" content="${e(pageDescription)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/svg+xml" href="${eventCatalogFavicon()}">
<script>try{var t=localStorage.getItem('ec-reference-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">
<style>${styles}${specIconStyles}</style>
</head>
<body>
<header class="topbar">
  <button class="icon-btn menu-btn" id="menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="sidenav">${ICON.menu}</button>
  <a class="brand" href="#overview">${model.logo ? `<img class="brand-logo" src="${e(model.logo.src)}" alt="${e(model.logo.alt)}" width="26" height="26">` : eventCatalogLogo(26, 'brand-logo')}<span class="name">${e(model.title)}</span><span class="brand-sep"></span><span class="brand-sub">Architecture reference</span></a>
  <div class="top-spacer"></div>
  <button class="search-btn" id="search-btn" aria-haspopup="dialog">${ICON.search}<span>Search the document</span><kbd id="kbd-hint">⌘K</kbd></button>
  <span class="date-chip">${e(formatDate(model.generatedAt).slice(0, 10))}</span>
  <button class="icon-btn" id="theme-btn" aria-label="Switch between light and dark">${ICON.theme}</button>
</header>
<div class="shell">
  <nav class="sidenav" id="sidenav" aria-label="Reference">
    <input class="nav-filter" id="nav-filter" type="search" placeholder="Filter" autocomplete="off" aria-label="Filter the navigation">
    ${navHtml}
    <p class="nav-empty" id="nav-empty" hidden>Nothing matches that filter.</p>
    <div class="nav-foot">Generated by EventCatalog<br>${e(formatDate(model.generatedAt))}</div>
  </nav>
  <main id="main">${main.join('\n')}</main>
</div>
<div class="nav-scrim" id="nav-scrim" hidden></div>
<div class="spec-modal" id="spec-modal" hidden role="dialog" aria-modal="true" aria-labelledby="spec-modal-title">
  <div class="spec-modal-scrim" data-close></div>
  <div class="code spec-modal-panel">
    <div class="code-head"><span class="spec-icon" id="spec-modal-icon"></span><span class="code-title" id="spec-modal-title"></span><button class="copy" aria-label="Copy code">${ICON.copy}<span>Copy</span></button><button class="copy download" aria-label="Download file">${ICON.download}<span>Download</span></button><button class="copy" data-close aria-label="Close">${ICON.close}</button></div>
    <pre><code></code></pre>
  </div>
</div>
<button class="to-top" id="to-top" type="button" aria-label="Back to top" hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<a class="made-with" href="https://www.eventcatalog.dev" target="_blank" rel="noopener" aria-label="Made with EventCatalog">${eventCatalogLogo(18)}<span>Made with <b>EventCatalog</b></span></a>
<div class="cmdk" id="cmdk" hidden role="dialog" aria-modal="true" aria-label="Search the document">
  <div class="cmdk-scrim" id="cmdk-scrim"></div>
  <div class="cmdk-panel">
    <div class="cmdk-in">${ICON.search}<input id="cmdk-input" type="text" placeholder="Search messages, services, domains and channels" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div>
    <div class="cmdk-results" id="cmdk-results" role="listbox"></div>
    <div class="cmdk-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span></div>
  </div>
</div>
<script type="application/json" id="search-index">${indexJson}</script>
<script>var highlightCode = ${highlightSource};\n${clientScript}</script>
</body>
</html>
`);
};
