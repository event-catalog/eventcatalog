/**
 * The diagram as far as the agent has written it. Hosts that stream a tool's arguments send them to the view as the
 * model writes them (`ui/notifications/tool-input-partial`), with what's unfinished closed off: a name cut short is
 * still a string. So an array's last item counts only once something is written after it (JSON keeps the order
 * things are written in); until then it may still be being written.
 */
import { Relation, Resource, type Model } from '@eventcatalog/visualiser/model';

/** Whether something was written after `key` in this object (so `key`'s value is finished) */
const isFinished = (object: Record<string, unknown>, key: string) => {
  const keys = Object.keys(object);
  const index = keys.indexOf(key);
  return index !== -1 && index < keys.length - 1;
};

/** The array's items that are finished and valid (an unfinished last item waits for the next update) */
function finishedItems<T>(items: unknown, finished: boolean, parse: (item: unknown) => T | undefined): T[] {
  if (!Array.isArray(items)) return [];
  return (finished ? items : items.slice(0, -1)).flatMap((item) => {
    const parsed = parse(item);
    return parsed === undefined ? [] : [parsed];
  });
}

/** What's finished of render_architecture's model, from its arguments so far: undefined until a resource is */
export function draftModel(args: Record<string, unknown>): Model | undefined {
  const model = args.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) return undefined;
  const written = model as Record<string, unknown>;
  const modelFinished = isFinished(args, 'model');

  const resources = finishedItems(written.resources, modelFinished || isFinished(written, 'resources'), (item) => {
    const parsed = Resource.safeParse(item);
    return parsed.success ? parsed.data : undefined;
  });
  if (!resources.length) return undefined;

  const ids = new Set(resources.map((resource) => resource.id));
  const relations = finishedItems(written.relations, modelFinished || isFinished(written, 'relations'), (item) => {
    const parsed = Relation.safeParse(item);
    // Only between resources it has so far
    return parsed.success && ids.has(parsed.data.from) && ids.has(parsed.data.to) ? parsed.data : undefined;
  });

  const title = typeof written.title === 'string' && isFinished(written, 'title') ? written.title : 'Architecture';
  return { title, resources, relations };
}

/** What a draft shows (laid out again only when it changes) */
export const draftKey = (model: Model) => `${model.resources.length}:${model.relations.length}`;
