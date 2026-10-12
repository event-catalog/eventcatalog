/**
 * The cursors of the other people in a live room, where they are on the canvas (it pans and zooms under them), each
 * an arrow in their colour with their name, as Excalidraw and Figma show them. The same size at any zoom.
 *
 * Who's here is React (it changes when someone joins, leaves or renames); where their cursors are isn't: each
 * cursor's element is moved directly as their pointer moves (`source`), and keeps its size with the canvas's
 * counter-scale, so nothing re-renders while people move their pointers, or while the canvas zooms.
 */
import { memo, useEffect, useRef } from 'react';
import type { CursorSource, Peer } from '../../collab/room';
import { CanvasPortal, createSmoother, COUNTER_SCALE, useCounterScale } from '@eventcatalog/visualiser/studio';

type Person = Pick<Peer, 'id' | 'name' | 'color'>;

export const LiveCursors = memo(function LiveCursors({ people, source }: { people: Person[]; source: CursorSource }) {
  const layer = useRef<HTMLDivElement>(null);
  useCounterScale(layer);
  const elements = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => {
    // Each cursor glides to where it was last said to be, a step a frame (they arrive about 20 times a second)
    const glide = createSmoother((shown) => {
      for (const [id, element] of elements.current) {
        const cursor = shown.get(id);
        element.style.display = cursor ? '' : 'none';
        if (cursor) element.style.transform = `translate(${cursor.x}px, ${cursor.y}px) scale(var(${COUNTER_SCALE}, 1))`;
      }
    });
    const place = (peers: ReadonlyMap<string, Peer>) => {
      const cursors = new Map<string, { x: number; y: number }>();
      peers.forEach((peer, id) => peer.cursor && cursors.set(id, peer.cursor));
      glide.set(cursors);
    };
    place(source.current());
    const unsubscribe = source.subscribe(place);
    return () => {
      unsubscribe();
      glide.stop();
    };
  }, [source, people]);
  return (
    <CanvasPortal>
      <div ref={layer} className="absolute left-0 top-0">
        {people.map((person) => (
          <div
            key={person.id}
            ref={(element) => void (element ? elements.current.set(person.id, element) : elements.current.delete(person.id))}
            className="studio-live-cursor"
            style={{ display: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M2 1.5 L15.5 8.2 L9.2 9.6 L6.6 15.8 Z" fill={person.color} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <span style={{ background: person.color }}>{person.name}</span>
          </div>
        ))}
      </div>
    </CanvasPortal>
  );
});
