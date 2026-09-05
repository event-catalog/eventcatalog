import { useEffect, useMemo, useState } from 'react';
import type { SchemaDetails, SchemaItem } from './types';

// Scoped to the explorer component's lifetime by the caller. Also deduplicates
// requests when the selected version is one of the comparison versions.
export const createSchemaDetailsLoader = () => {
  const requests = new Map<string, Promise<SchemaDetails>>();
  const resolved = new Map<string, SchemaDetails>();
  const load = (url: string): Promise<SchemaDetails> => {
    const existing = requests.get(url);
    if (existing) return existing;
    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load schema content. Please try again.');
        const details = await response.json();
        if (typeof details.schemaContent !== 'string' || !Array.isArray(details.examples)) {
          throw new Error('Unable to load schema content. Please try again.');
        }
        resolved.set(url, details);
        return details as SchemaDetails;
      })
      .catch((error) => {
        requests.delete(url);
        throw error;
      });
    requests.set(url, request);
    return request;
  };
  return Object.assign(load, { peek: (url: string) => resolved.get(url) });
};

export function useSchemaDetails(
  item: SchemaItem | undefined,
  load: ReturnType<typeof createSchemaDetailsLoader>,
  enabled = true
) {
  const url = enabled ? item?.contentUrl : undefined;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ url: string; details?: SchemaDetails; error?: string }>();

  useEffect(() => {
    if (!url || load.peek(url)) return;
    let current = true;
    setState(undefined);
    load(url).then(
      (details) => current && setState({ url, details }),
      () => current && setState({ url, error: 'Unable to load schema content. Please try again.' })
    );
    return () => {
      current = false;
    };
  }, [url, load, attempt]);

  const matchingState = state?.url === url ? state : undefined;
  const details = url ? matchingState?.details || load.peek(url) : undefined;
  const message = useMemo(
    () => (item && details ? { ...item, ...details, data: { ...item.data, ...details.data } } : item),
    [item, details]
  );
  return {
    message,
    loading: !!url && !details && !matchingState?.error,
    error: details ? undefined : matchingState?.error,
    retry: () => {
      setState(undefined);
      setAttempt((value) => value + 1);
    },
  };
}
