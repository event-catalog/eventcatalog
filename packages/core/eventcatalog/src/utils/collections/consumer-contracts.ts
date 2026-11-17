import { versionMatches } from '@utils/collections/util';

/**
 * Consumer contracts: the contract a consumer (a service, agent or domain) has with the producer of a message it
 * receives, attached to the `receives` pointer as a file (for example a Pact file). The file is shown as written.
 *
 * These read raw (unhydrated) resources, because hydration replaces `receives` pointers with the messages they
 * point at and drops `contract`.
 */

type ContractPointer = { path: string; name?: string; type?: string };

type ReceivesPointer = { id: string; version?: string; contract?: ContractPointer };

type Consumer = {
  collection: string;
  filePath?: string;
  data: { id: string; version: string; name?: string; receives?: ReceivesPointer[] };
};

type Message = { data: { id: string; version: string; latestVersion?: string } };

export type ConsumerContract = {
  /** The file's path, relative to the consumer's folder */
  path: string;
  /** The name to show: the pointer's `name`, or the file's name */
  name: string;
  /** A free-text hint of the format, such as `pact` */
  type?: string;
  filename: string;
  /** The contract's segment in its page URL: /docs/{collection}/{id}/{version}/contracts/{slug} */
  slug: string;
  /** The messages this file is the contract for (one Pact file often covers several) */
  messages: { id: string; version: string }[];
};

/** A consumer's contract for one message, as listed on that message */
export type MessageConsumerContract = {
  consumer: { collection: string; id: string; version: string; name: string };
  contract: ConsumerContract;
  /** The contract's segment in its page URL under the message: /docs/{collection}/{id}/{version}/contracts/{slug} */
  slug: string;
};

const getFilename = (filePath: string) => filePath.split(/[\\/]/).filter(Boolean).at(-1) ?? filePath;

const slugify = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/** Gives each slug it is asked for a page URL of its own: one already given out gets a number */
const uniqueSlugs = () => {
  const used = new Set<string>();
  return (slug: string) => {
    let unique = slug;
    for (let suffix = 2; used.has(unique); suffix++) unique = `${slug}-${suffix}`;
    used.add(unique);
    return unique;
  };
};

/** `./contracts/orders.pact.json` and `contracts/orders.pact.json` are the same file */
const normalisePath = (filePath: string) => filePath.replace(/\\/g, '/').replace(/^(\.\/)+/, '');

/** The contracts a consumer has, one per file: a file attached to several messages is listed once, with them all */
export const getConsumerContractsForResource = (resource: Consumer): ConsumerContract[] => {
  const contracts = new Map<string, ConsumerContract>();

  for (const pointer of resource.data.receives || []) {
    if (!pointer.contract?.path) continue;

    const key = normalisePath(pointer.contract.path);
    const message = { id: pointer.id, version: pointer.version ?? 'latest' };
    const existing = contracts.get(key);

    if (existing) {
      existing.messages.push(message);
      continue;
    }

    const filename = getFilename(pointer.contract.path);
    contracts.set(key, {
      path: pointer.contract.path,
      name: pointer.contract.name || filename,
      type: pointer.contract.type,
      filename,
      slug: slugify(filename.replace(/\.[^.]*$/, '')),
      messages: [message],
    });
  }

  // Each contract needs its own URL. Files that share a name (in different folders, or with different extensions)
  // get their whole path, extension included; anything that still collides gets a number.
  const all = [...contracts.entries()];
  const slugCount = new Map<string, number>();
  for (const [, contract] of all) slugCount.set(contract.slug, (slugCount.get(contract.slug) ?? 0) + 1);

  const unique = uniqueSlugs();

  return all.map(([key, contract]) => ({
    ...contract,
    slug: unique(((slugCount.get(contract.slug) ?? 0) > 1 ? slugify(key) : contract.slug) || 'contract'),
  }));
};

/** Old versions live in a versioned folder: what they receive is history, not the catalog today */
const isLatestVersion = (entry: { filePath?: string }) => !entry.filePath?.includes('versioned');

/**
 * Whether a receives pointer points at this version of a message, as on the message's pages: one without a
 * version (or "latest") points at the latest version only; others match exactly, by semver range or by x-pattern
 */
const pointsAtMessage = (pointer: ReceivesPointer, message: Message) => {
  if (pointer.id !== message.data.id) return false;
  if (!pointer.version || pointer.version === 'latest') {
    return message.data.version === (message.data.latestVersion ?? message.data.version);
  }
  return versionMatches(message.data.version, pointer.version);
};

/** The contracts consumers (their latest versions) have for this version of a message */
export const getConsumerContractsForMessage = (message: Message, consumers: Consumer[]): MessageConsumerContract[] => {
  const contracts = consumers.filter(isLatestVersion).flatMap((consumer) => {
    const paths = new Set(
      (consumer.data.receives || [])
        .filter((pointer) => pointer.contract?.path && pointsAtMessage(pointer, message))
        .map((pointer) => normalisePath(pointer.contract!.path))
    );

    if (paths.size === 0) return [];

    const consumerRef = {
      collection: consumer.collection,
      id: consumer.data.id,
      version: consumer.data.version,
      name: consumer.data.name || consumer.data.id,
    };

    // From all of the consumer's contracts, so each slug matches the contract's page
    return getConsumerContractsForResource(consumer)
      .filter((contract) => paths.has(normalisePath(contract.path)))
      .map((contract) => ({ consumer: consumerRef, contract }));
  });

  // Under the message a contract is named after its consumer. Consumers that share an id (a service and an
  // agent) get their collection too, and a consumer with several contracts for the message gets the file's name.
  const count = (key: (entry: (typeof contracts)[number]) => string) => {
    const counts = new Map<string, number>();
    for (const entry of contracts) counts.set(key(entry), (counts.get(key(entry)) ?? 0) + 1);
    return (entry: (typeof contracts)[number]) => counts.get(key(entry)) ?? 0;
  };
  const byId = (entry: (typeof contracts)[number]) => entry.consumer.id;
  const byConsumer = (entry: (typeof contracts)[number]) => `${entry.consumer.collection}-${entry.consumer.id}`;
  const sharesId = count(byId);
  const sharesConsumer = count(byConsumer);

  const unique = uniqueSlugs();

  return contracts.map((entry) => {
    const consumerSlug = sharesId(entry) > sharesConsumer(entry) ? byConsumer(entry) : byId(entry);
    return {
      ...entry,
      slug: unique(sharesConsumer(entry) > 1 ? `${consumerSlug}-${entry.contract.slug}` : consumerSlug),
    };
  });
};

/**
 * The page a contract is shown on: under its consumer (with the contract's slug), or under a message it
 * covers (with the slug the message gives it), so it can be read without leaving either
 */
export const getConsumerContractPath = (resource: { collection: string; id: string; version: string }, slug: string) =>
  `/docs/${resource.collection}/${resource.id}/${resource.version}/contracts/${slug}`;
