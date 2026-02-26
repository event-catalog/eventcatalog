import { useCallback, memo } from "react";
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
  const producerName = serviceList[0];
  const consumerName =
    kind === "openapi" ? "FrontendApp" : "NotificationService";
  const consumerSummary =
    kind === "openapi"
      ? "Web application that consumes the API"
      : "Sends notifications when events occur";
  const serviceRefs = serviceList.map((s) => `  service ${s}`).join("\n");

  const messageName = kind === "openapi" ? "GetOrder" : "OrderCreated";
  const messageType = kind === "openapi" ? "queries" : "events";
  const sendVerb = kind === "openapi" ? "receives query" : "sends event";
  const receiveVerb = kind === "openapi" ? "sends query" : "receives event";

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
      id: "consumer",
      title: "Add a consuming service",
      description:
        kind === "openapi"
          ? "Import a query from your spec and wire up a consumer."
          : "Import an event from your spec and wire up a consumer.",
      type: "transform",
      apply: (content) => {
        // 1. Add the message import from the spec file
        const importLine = `import ${messageType} { ${messageName} } from "./${specFile}"`;

        // Insert after the last import line, or before the first non-empty line
        const lastImport = content.lastIndexOf("\nimport ");
        let updated: string;
        if (lastImport >= 0) {
          const endOfLine = content.indexOf("\n", lastImport + 1);
          updated =
            content.slice(0, endOfLine) +
            "\n" +
            importLine +
            content.slice(endOfLine);
        } else {
          updated = importLine + "\n" + content;
        }

        // 2. Add "sends/receives" to the producer service if it exists as a block
        const producerBlockRe = new RegExp(
          `(service\\s+${producerName}\\s*\\{[^}]*)(\\n\\})`,
          "m",
        );
        const producerMatch = updated.match(producerBlockRe);
        if (producerMatch && producerMatch.index !== undefined) {
          const insertAt = producerMatch.index + producerMatch[1].length;
          updated =
            updated.slice(0, insertAt) +
            `\n  ${sendVerb} ${messageName}` +
            updated.slice(insertAt);
        }

        // 3. Add consumer service definition before the visualizer block
        const serviceBlock = `service ${consumerName} {\n  version 1.0.0\n  summary "${consumerSummary}"\n  ${receiveVerb} ${messageName}\n}\n\n`;
        const vizIndex = updated.search(/^visualizer\s/m);
        if (vizIndex >= 0) {
          updated =
            updated.slice(0, vizIndex) + serviceBlock + updated.slice(vizIndex);
        } else {
          updated = updated + "\n" + serviceBlock;
        }

        // 4. Add the consumer service into the visualizer block
        updated = insertIntoVisualizerBlock(
          updated,
          `  service ${consumerName}`,
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
      href: "https://www.eventcatalog.dev/docs/eventcatalog-dsl/introduction",
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
  const completedSteps = new Set(ws.guideDone);
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

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

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
          onClick={handleDismiss}
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
