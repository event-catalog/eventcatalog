import { useCallback, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import {
  createThread as createThreadInDoc,
  deleteThread as deleteThreadInDoc,
  getCanvasMaps,
  moveThread as moveThreadInDoc,
  readThreads,
  replyToThread,
  setThreadResolved,
  type Author,
  type CommentAnchor,
  type Thread,
} from '../canvas-doc';

export type { Author, CommentAnchor, Message, Thread } from '../canvas-doc';

/** Comment threads in the shared canvas document */
export function useComments(doc: Y.Doc | null, author: Author) {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!doc) return setThreads([]);
    const { threads: yThreads } = getCanvasMaps(doc);
    const sync = () => setThreads(readThreads(doc));
    sync();
    yThreads.observeDeep(sync);
    return () => yThreads.unobserveDeep(sync);
  }, [doc]);

  const createThread = useCallback(
    (anchor: CommentAnchor, text: string) => (doc ? createThreadInDoc(doc, anchor, text, author) : undefined),
    [doc, author]
  );
  const reply = useCallback((threadId: string, text: string) => doc && replyToThread(doc, threadId, text, author), [doc, author]);
  const setResolved = useCallback(
    (threadId: string, resolved: boolean) => doc && setThreadResolved(doc, threadId, resolved),
    [doc]
  );
  const moveThread = useCallback(
    (threadId: string, anchor: CommentAnchor) => doc && moveThreadInDoc(doc, threadId, anchor),
    [doc]
  );
  const deleteThread = useCallback((threadId: string) => doc && deleteThreadInDoc(doc, threadId), [doc]);

  return { threads, createThread, reply, setResolved, moveThread, deleteThread };
}
