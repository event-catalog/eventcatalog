import { useCallback, useMemo, memo } from "react";
import { useStore } from "@nanostores/react";
import { X, ChevronRight, Check, ExternalLink } from "lucide-react";
import { $workspace, saveWorkspace } from "../stores/workspace";
import type { SpecKind } from "../stores/workspace";

interface TransformStep {
  id: string;
  title: string;
  description: string;
  type: "transform";
  apply: (content: string) => string;
}

interface ActionStep {
  id: string;
  title: string;
  description: string;
  type: "action";
  action: () => void;
}

interface LinkStep {
  id: string;
  title: string;
  description: string;
  type: "link";
  href: string;
}

type Step = TransformStep | ActionStep | LinkStep;

/**
 * Insert a line inside the visualizer block, right before the closing `}`.
 * Returns the original content unchanged if no visualizer block is found.
 */
function insertIntoVisualizerBlock(content: string, line: string): string {
  const match = content.match(/(visualizer\s+\w+\s*\{[\s\S]*?)(^\})/m);
  if (!match || match.index === undefined) return content;
  const insertPos = match.index + match[1].length;
  return content.slice(0, insertPos) + line + "\n" + content.slice(insertPos);
}

/**
 * Replace service references in the visualizer block with a domain reference.
 */
function replaceServicesWithDomain(
  content: string,
  serviceNames: string[],
  domainName: string,
): string {
  const vizMatch = content.match(/(visualizer\s+\w+\s*\{)([\s\S]*?)(^\})/m);
  if (!vizMatch || vizMatch.index === undefined) return content;

  const before = content.slice(0, vizMatch.index + vizMatch[1].length);
  let body = vizMatch[2];
  const after = content.slice(
    vizMatch.index + vizMatch[1].length + vizMatch[2].length,
  );

  for (const name of serviceNames) {
    body = body.replace(
      new RegExp(`^[ \t]*service\\s+${name}[ \t]*$\\n?`, "m"),
      "",
    );
  }

  body = body + `  domain ${domainName}\n`;

  return before + body + after;
}

function getSteps(
  kind: SpecKind,
  specFile: string,
  serviceNames: string[],
  onExportCatalog: () => void,
): Step[] {
  const serviceList = serviceNames.length > 0 ? serviceNames : ["MyService"];
  const domainName = kind === "openapi" ? "ApiDomain" : "EventsDomain";
  const serviceRefs = serviceList.map((s) => `  service ${s}`).join("\n");

  return [
    {
      id: "domain",
      title: "Wrap your service in a domain",
      description: "Group related services under a business domain.",
      type: "transform",
      apply: (content) => {
        const domainBlock = `domain ${domainName} {\n  version 1.0.0\n  summary "Groups related ${kind === "openapi" ? "API" : "event-driven"} services"\n${serviceRefs}\n}\n\n`;
        const vizIndex = content.search(/^visualizer\s/m);
        let updated: string;
        if (vizIndex >= 0) {
          updated =
            content.slice(0, vizIndex) + domainBlock + content.slice(vizIndex);
        } else {
          updated = content + "\n" + domainBlock;
        }
        updated = replaceServicesWithDomain(updated, serviceList, domainName);
        return updated;
      },
    },
    {
      id: "new-service",
      title: "Add a new service",
      description: "Add a draft service that produces and consumes messages.",
      type: "transform",
      apply: (content) => {
        // Add a new draft service that sends events/commands and receives queries
        const serviceBlock = [
          `service FullfillmentService {`,
          `  version 0.1.0`,
          `  draft true`,
          `  summary "Handles order fullfillment and shipping"`,
          `  sends event ShipmentDispatched {`,
          `    version 1.0.0`,
          `    summary "Raised when a shipment leaves the warehouse"`,
          `  }`,
          `  sends command RequestPickup {`,
          `    version 1.0.0`,
          `    summary "Requests a carrier pickup for a parcel"`,
          `  }`,
          `  receives query GetShipmentStatus {`,
          `    version 1.0.0`,
          `    summary "Returns the current status of a shipment"`,
          `  }`,
          `  receives event OrderCreated {`,
          `    version 1.0.0`,
          `    summary "Triggers fullfillment when a new order is placed"`,
          `  }`,
          `}`,
          ``,
          ``,
        ].join("\n");

        const vizIndex = content.search(/^visualizer\s/m);
        let updated: string;
        if (vizIndex >= 0) {
          updated =
            content.slice(0, vizIndex) + serviceBlock + content.slice(vizIndex);
        } else {
          updated = content + "\n" + serviceBlock;
        }

        // Add the service into the visualizer block
        updated = insertIntoVisualizerBlock(
          updated,
          `  service FullfillmentService`,
        );

        return updated;
      },
    },
    {
      id: "export",
      title: "Export into documentation",
      description: "Download as an EventCatalog project.",
      type: "action",
      action: onExportCatalog,
    },
    {
      id: "learn",
      title: "Learn more",
      description: "Read the EventCatalog DSL docs.",
      type: "link",
      href: "/docs",
    },
  ];
}

interface NextStepsGuideProps {
  specKind: SpecKind;
  specFile: string;
  serviceNames: string[];
  onApplyStep: (transform: (content: string) => string) => void;
  onExportCatalog: () => void;
  onDismiss: () => void;
}

export const NextStepsGuide = memo(function NextStepsGuide({
  specKind,
  specFile,
  serviceNames,
  onApplyStep,
  onExportCatalog,
  onDismiss,
}: NextStepsGuideProps) {
  const ws = useStore($workspace);
  const completedSteps = useMemo(() => new Set(ws.guideDone), [ws.guideDone]);
  const steps = getSteps(specKind, specFile, serviceNames, onExportCatalog);

  const handleStepClick = useCallback(
    (step: Step) => {
      if (step.type === "link") {
        window.open(step.href, "_blank", "noopener,noreferrer");
        // Mark as done
        const next = [...ws.guideDone, step.id];
        $workspace.setKey("guideDone", next);
        saveWorkspace();
        return;
      }

      if (completedSteps.has(step.id)) return;

      if (step.type === "action") {
        step.action();
      } else {
        onApplyStep(step.apply);
      }

      const next = [...ws.guideDone, step.id];
      $workspace.setKey("guideDone", next);
      saveWorkspace();
    },
    [completedSteps, onApplyStep, ws.guideDone],
  );

  const transformSteps = steps.filter(
    (s) => s.type === "transform" || s.type === "action",
  );
  const allTransformsDone = transformSteps.every((s) =>
    completedSteps.has(s.id),
  );

  return (
    <div className="next-steps-guide">
      <div className="next-steps-header">
        <div>
          <h3 className="next-steps-title">
            {allTransformsDone ? "Nice work!" : "What to do next"}
          </h3>
          <p className="next-steps-subtitle">
            {allTransformsDone
              ? "You've completed all the steps. Keep building your architecture."
              : `${completedSteps.size} of ${steps.length} steps`}
          </p>
        </div>
        <button
          type="button"
          className="next-steps-close"
          onClick={onDismiss}
          aria-label="Dismiss guide"
        >
          <X size={14} />
        </button>
      </div>
      <div className="next-steps-list">
        {steps.map((step) => {
          const done = completedSteps.has(step.id);
          const isLink = step.type === "link";
          return (
            <button
              key={step.id}
              type="button"
              className={`next-steps-item${done ? " next-steps-item--done" : ""}`}
              onClick={() => handleStepClick(step)}
              disabled={done && !isLink}
            >
              <span className="next-steps-item-check">
                {done ? (
                  <Check size={12} />
                ) : (
                  <span className="next-steps-item-dot" />
                )}
              </span>
              <div className="next-steps-item-body">
                <span className="next-steps-item-title">{step.title}</span>
                <span className="next-steps-item-desc">{step.description}</span>
              </div>
              {!done &&
                (isLink ? (
                  <ExternalLink size={14} className="next-steps-item-arrow" />
                ) : (
                  <ChevronRight size={14} className="next-steps-item-arrow" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
});
