/**
 * An entity's properties, in its card's edit form (in EventCatalog's Studio and on the web): each a name and a type,
 * edited where they are (saved as they're typed), added and removed. Styled in studio.css.
 */
import { Plus, X } from "lucide-react";
import type { EntityProperty } from "../../model/schema";
import { EditableText } from "./NodeCard";

/** A name for a new property that none of the others has (its connections are joined by name) */
const newPropertyName = (properties: EntityProperty[]) => {
  const taken = new Set(properties.map((property) => property.name));
  let count = properties.length + 1;
  while (taken.has(`property${count}`)) count++;
  return `property${count}`;
};

export function EntityProperties({
  properties,
  onChange,
  onSaved,
}: {
  properties: EntityProperty[];
  /** The properties as they are now (save them with `setEntityProperties`, which keeps connections to them joined) */
  onChange: (next: EntityProperty[]) => void;
  /** Something was saved (to say so) */
  onSaved: () => void;
}) {
  const change = (index: number, field: Partial<EntityProperty>) =>
    onChange(
      properties.map((property, at) =>
        at === index ? { ...property, ...field } : property,
      ),
    );
  return (
    <div className="ec-entity-props">
      {properties.map((property, index) => (
        <div key={index} className="ec-entity-prop-row">
          <EditableText
            label="Property name"
            value={property.name}
            onSave={(name) => change(index, { name })}
            onSaved={onSaved}
            placeholder="name"
            required
            // Its connections are joined to it by name: two with the same name couldn't be told apart
            accept={(name) =>
              properties.every(
                (other, at) => at === index || other.name !== name,
              )
            }
          />
          <EditableText
            label="Property type"
            value={property.type}
            onSave={(type) => change(index, { type })}
            onSaved={onSaved}
            placeholder="type"
            className="ec-entity-prop-type-input"
            required
          />
          <button
            type="button"
            className="ec-icon-button ec-entity-prop-remove"
            aria-label={`Remove ${property.name}`}
            onClick={() => {
              onChange(properties.filter((_, at) => at !== index));
              onSaved();
            }}
          >
            <X aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ec-entity-prop-add"
        onClick={() => {
          onChange([
            ...properties,
            { name: newPropertyName(properties), type: "string" },
          ]);
          onSaved();
        }}
      >
        <Plus aria-hidden /> Add property
      </button>
    </div>
  );
}
