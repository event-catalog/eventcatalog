/**
 * The agent's walkthrough card at the bottom left of the canvas, as EventCatalog's flow walkthrough has it: where you
 * are, what happens at this step, and back / next.
 */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';

type WalkthroughProps = {
  /** What's being walked through, e.g. the walkthrough's name */
  title: string;
  /** Above the title, e.g. "Claude is showing you" */
  kicker: ReactNode;
  /** This step's text */
  body?: ReactNode;
  index: number;
  count: number;
  onStep: (index: number) => void;
  onClose: () => void;
  /** Playing on its own (the agent's walkthroughs) */
  playing?: boolean;
  onTogglePlay?: () => void;
};

export function Walkthrough({ title, kicker, body, index, count, onStep, onClose, playing, onTogglePlay }: WalkthroughProps) {
  return (
    <div className="ec-walk" role="region" aria-label={title}>
      <div className="ec-walk-header">
        <div className="ec-walk-heading">
          <span className="ec-walk-kicker">{kicker}</span>
          <span className="ec-walk-title">{title}</span>
        </div>
        <button type="button" className="ec-icon-button" aria-label="Close" onClick={onClose}>
          <X aria-hidden />
        </button>
      </div>
      <div className="ec-walk-body">
        <span className="ec-step-number">{index + 1}</span>
        <p className="ec-walk-text">{body}</p>
      </div>
      <div className="ec-walk-footer">
        <div className="ec-walk-dots" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} data-active={i === index || undefined} data-done={i < index || undefined} />
          ))}
        </div>
        <span className="ec-walk-count">
          {index + 1} of {count}
        </span>
        {onTogglePlay && (
          <button type="button" className="ec-icon-button" aria-label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          </button>
        )}
        <button type="button" className="ec-icon-button" aria-label="Previous" disabled={index === 0} onClick={() => onStep(index - 1)}>
          <ChevronLeft aria-hidden />
        </button>
        <button type="button" className="ec-icon-button" aria-label="Next" disabled={index === count - 1} onClick={() => onStep(index + 1)}>
          <ChevronRight aria-hidden />
        </button>
      </div>
    </div>
  );
}
