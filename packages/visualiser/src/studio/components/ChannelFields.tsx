/**
 * A channel's type and whether it's a dead letter channel, in its card's edit form (in EventCatalog's Studio and on
 * the web): saved as soon as they're picked, shown on the channel's card as they are in the catalog. Styled in
 * studio.css.
 */
import { useId } from "react";
import {
  ArrowRightLeft,
  ListEnd,
  OctagonX,
  RadioTower,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { CHANNEL_TYPES, type ChannelKind } from "../../utils/channel-types";

/** What's written to the channel's data (`data.channel`), as the catalog's channels have it */
export type ChannelFieldsChange = {
  type?: ChannelKind;
  isDeadLetterChannel?: boolean;
};

const TYPE_OPTIONS: Array<{
  value: ChannelKind | undefined;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  {
    value: undefined,
    label: "None",
    icon: ArrowRightLeft,
    hint: "No particular type",
  },
  {
    value: "queue",
    label: CHANNEL_TYPES.queue.label,
    icon: ListEnd,
    hint: "Each message goes to one consumer (e.g. SQS)",
  },
  {
    value: "topic",
    label: CHANNEL_TYPES.topic.label,
    icon: RadioTower,
    hint: "Every subscription gets a copy (e.g. SNS)",
  },
  {
    value: "stream",
    label: CHANNEL_TYPES.stream.label,
    icon: Waves,
    hint: "An ordered log consumers read at their own offset (e.g. a Kafka topic)",
  },
];

export function ChannelFields({
  type,
  deadLetter = false,
  onChange,
  onSaved,
}: {
  /** Its type now (`queue`, `topic` or `stream`), if it has one */
  type?: string;
  /** Whether it's a dead letter channel now */
  deadLetter?: boolean;
  onChange: (change: ChannelFieldsChange) => void;
  /** Something was saved (to say so) */
  onSaved: () => void;
}) {
  const typeLabelId = useId();
  const current = TYPE_OPTIONS.some((option) => option.value === type)
    ? type
    : undefined;
  return (
    <>
      <div className="ec-field">
        <span id={typeLabelId} className="ec-field-label">
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby={typeLabelId}
          className="ec-segmented"
        >
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={current === value}
              title={hint}
              className="ec-segmented-option"
              onClick={() => {
                if (current === value) return;
                onChange({ type: value });
                onSaved();
              }}
            >
              <Icon aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="ec-field ec-check-field">
        <input
          type="checkbox"
          checked={deadLetter}
          onChange={(event) => {
            onChange({ isDeadLetterChannel: event.target.checked });
            onSaved();
          }}
        />
        <OctagonX aria-hidden className="ec-check-field-icon" />
        <span>
          <span className="ec-check-field-title">Dead letter channel</span>
          <span className="ec-check-field-hint">
            Where other channels send the messages they can't deliver
          </span>
        </span>
      </label>
    </>
  );
}
