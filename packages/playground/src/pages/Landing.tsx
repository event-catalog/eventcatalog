import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeroPreview, StepVisualizer } from "../components/HeroPreview";
import { X, Upload, Play, Link2 } from "lucide-react";
import { createWorkspace } from "../stores/workspace";
import type { SpecKind } from "../stores/workspace";
import "./Landing.css";

/** Official OpenAPI Initiative mark (simplified chain-link icon) */
function OpenApiIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="38 123 125 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          fill="#93D500"
          d="M74.909,189.069h-0.113l-29.444,0c0.005,0.144,0.009,0.289,0.017,0.433c0.012,0.278,0.032,0.555,0.049,0.833c0.008,0.119,0.013,0.238,0.022,0.356c0.023,0.322,0.051,0.642,0.08,0.962c0.007,0.073,0.013,0.145,0.02,0.215c0.034,0.356,0.073,0.712,0.115,1.065c0.002,0.035,0.006,0.069,0.011,0.103c0.046,0.382,0.095,0.764,0.151,1.144c0,0.004,0.001,0.01,0.003,0.014c0.339,2.356,0.848,4.69,1.527,6.984c0.003,0.01,0.007,0.019,0.009,0.029c0.106,0.361,0.218,0.72,0.333,1.077c0.007,0.021,0.014,0.042,0.02,0.063s0.013,0.042,0.02,0.063c0.105,0.323,0.215,0.645,0.325,0.968c0.029,0.081,0.056,0.163,0.086,0.244c0.099,0.279,0.2,0.558,0.304,0.837c0.048,0.126,0.096,0.251,0.143,0.378c0.09,0.231,0.179,0.46,0.27,0.691c0.069,0.173,0.141,0.346,0.213,0.519c0.074,0.18,0.15,0.359,0.226,0.54c0.094,0.22,0.192,0.439,0.289,0.658c0.058,0.131,0.117,0.261,0.175,0.391c0.12,0.263,0.244,0.526,0.368,0.787c0.041,0.084,0.08,0.168,0.122,0.252c0.145,0.301,0.293,0.599,0.443,0.895c0.025,0.046,0.047,0.091,0.07,0.137c0.169,0.328,0.341,0.656,0.518,0.981c0.008,0.014,0.016,0.028,0.023,0.044c0.037,0.068,0.078,0.133,0.115,0.2l25.243-15.207l0.093-0.056C75.759,193.57,75.139,191.338,74.909,189.069z"
        />
        <path
          fill="#6BA43A"
          d="M80.005,200.564c-0.225-0.25-0.439-0.506-0.649-0.765c-0.186-0.23-0.366-0.462-0.54-0.697c-0.199-0.27-0.394-0.541-0.578-0.818c-0.186-0.278-0.368-0.558-0.54-0.843l-25.275,15.226c0.388,0.645,0.793,1.273,1.206,1.894c0.014,0.021,0.027,0.044,0.041,0.065c0.005,0.008,0.01,0.015,0.015,0.023c0.014,0.02,0.026,0.042,0.04,0.063c0.001,0.002,0.003,0.004,0.004,0.006c0.033,0.05,0.067,0.098,0.101,0.148c0.002,0.003,0.004,0.006,0.006,0.009c0.001,0.001,0.002,0.003,0.003,0.004c0.439,0.649,0.89,1.288,1.355,1.91c0.01,0.013,0.021,0.027,0.031,0.04c0.01,0.013,0.02,0.026,0.03,0.039c0.202,0.268,0.405,0.535,0.614,0.8c0.027,0.035,0.054,0.069,0.083,0.103c0.214,0.274,0.432,0.544,0.654,0.812c0.052,0.063,0.106,0.127,0.158,0.191c0.2,0.239,0.4,0.477,0.604,0.713c0.087,0.101,0.178,0.202,0.266,0.302c0.174,0.198,0.346,0.395,0.524,0.59c0.097,0.107,0.198,0.215,0.297,0.322c0.045,0.049,0.089,0.097,0.135,0.146c0.13,0.14,0.259,0.28,0.39,0.419c0.052,0.055,0.107,0.109,0.16,0.164c0.23,0.24,0.462,0.48,0.699,0.716l20.85-20.85C80.45,201.057,80.226,200.811,80.005,200.564z"
        />
        <path
          fill="#4D5A31"
          d="M82.173,202.638l-0.071,0.071l-20.819,20.82c0.107,0.1,0.213,0.201,0.323,0.298c0.194,0.176,0.392,0.351,0.589,0.523c0.102,0.091,0.202,0.181,0.304,0.269c0.236,0.204,0.474,0.403,0.711,0.602c0.065,0.054,0.128,0.107,0.192,0.16c0.267,0.221,0.539,0.438,0.812,0.654c0.035,0.027,0.07,0.055,0.105,0.083c0.295,0.232,0.593,0.458,0.894,0.686c0.013,0.008,0.024,0.016,0.034,0.025c1.254,0.937,2.554,1.815,3.895,2.633c0.046,0.029,0.092,0.056,0.139,0.085c0.255,0.153,0.51,0.304,0.767,0.453c0.157,0.09,0.314,0.179,0.471,0.268c0.148,0.086,0.296,0.168,0.446,0.251c0.27,0.148,0.542,0.295,0.814,0.439c0.037,0.02,0.075,0.04,0.113,0.06c0.757,0.396,1.527,0.764,2.303,1.118l0.739-1.794l10.471-25.429l0.039-0.094C84.3,204.207,83.204,203.482,82.173,202.638z"
        />
        <path
          fill="#93D500"
          d="M119.99,228.696l-0.516-0.856l-14.19-23.555c-0.287,0.173-0.581,0.329-0.874,0.487c-0.296,0.159-0.594,0.308-0.896,0.451c-2.726,1.293-5.677,1.953-8.632,1.953c-1.936,0-3.871-0.28-5.742-0.838c-0.319-0.095-0.63-0.22-0.945-0.332c-0.315-0.111-0.634-0.207-0.944-0.335l-10.464,25.412l-0.41,0.996l-0.351,0.853c0.027,0.011,0.055,0.02,0.082,0.031c0.029,0.012,0.057,0.021,0.086,0.033c0.007,0.003,0.014,0.005,0.02,0.008c0.247,0.101,0.496,0.188,0.744,0.285c0.311,0.121,0.622,0.244,0.934,0.358c0.159,0.058,0.317,0.126,0.476,0.182c3.278,1.158,6.67,1.968,10.119,2.422c0.135,0.016,0.269,0.035,0.404,0.054c0.141,0.016,0.283,0.03,0.424,0.046c0.266,0.03,0.531,0.061,0.798,0.087c0.066,0.005,0.132,0.011,0.198,0.017c0.327,0.031,0.654,0.059,0.979,0.082c0.111,0.008,0.223,0.013,0.333,0.021c0.287,0.019,0.572,0.037,0.858,0.05c0.175,0.01,0.35,0.015,0.526,0.021c0.227,0.008,0.453,0.017,0.682,0.024c0.327,0.008,0.657,0.011,0.986,0.012c0.078,0,0.155,0.002,0.232,0.003c2.755,0,5.509-0.229,8.233-0.686c0.046-0.007,0.091-0.015,0.138-0.021c0.288-0.05,0.576-0.104,0.864-0.157c0.164-0.032,0.329-0.063,0.491-0.095c0.168-0.035,0.337-0.07,0.505-0.106c0.281-0.059,0.561-0.12,0.842-0.185c0.05-0.011,0.101-0.021,0.152-0.035c4.141-0.965,8.14-2.459,11.897-4.436c0.246-0.13,0.486-0.278,0.731-0.411c0.292-0.16,0.582-0.325,0.872-0.491c0.201-0.115,0.404-0.221,0.603-0.34L119.99,228.696z"
        />
        <path
          fill="#6BA43A"
          d="M93.914,137.485c-0.333,0.007-0.667,0.008-1,0.021c-2.086,0.084-4.168,0.297-6.233,0.643c-0.045,0.008-0.09,0.015-0.136,0.023c-0.29,0.05-0.577,0.103-0.865,0.157c-0.163,0.031-0.327,0.061-0.49,0.094c-0.17,0.034-0.339,0.069-0.508,0.106c-0.28,0.058-0.56,0.119-0.84,0.184c-0.051,0.011-0.101,0.023-0.153,0.034c-4.141,0.966-8.142,2.461-11.898,4.438c-0.245,0.13-0.484,0.277-0.728,0.411c-0.292,0.16-0.582,0.325-0.872,0.491c-0.215,0.124-0.434,0.238-0.648,0.366c-0.002,0.001-0.005,0.003-0.007,0.004c-0.015,0.009-0.03,0.017-0.045,0.026c-0.056,0.034-0.114,0.062-0.17,0.096l0.516,0.857l14.705,24.412c0.287-0.173,0.581-0.33,0.874-0.487c0.295-0.159,0.594-0.308,0.895-0.451c2.1-1,4.332-1.62,6.601-1.85c0.333-0.034,0.666-0.062,1-0.079c0.333-0.017,0.666-0.034,1-0.034l0.001-29.487C94.58,137.465,94.247,137.479,93.914,137.485z"
        />
        <path
          fill="#4D5A31"
          d="M120.681,144.675c-0.04-0.025-0.082-0.049-0.122-0.073c-0.259-0.159-0.521-0.312-0.783-0.465c-0.152-0.088-0.304-0.173-0.457-0.26c-0.154-0.086-0.306-0.172-0.461-0.256c-0.266-0.146-0.533-0.29-0.801-0.432c-0.042-0.021-0.083-0.044-0.126-0.066c-1.729-0.904-3.505-1.7-5.318-2.391c-0.046-0.019-0.094-0.037-0.141-0.054c-0.395-0.148-0.791-0.295-1.19-0.433c-3.221-1.125-6.552-1.914-9.936-2.358c-0.138-0.019-0.277-0.038-0.415-0.056c-0.139-0.017-0.277-0.031-0.415-0.046c-0.267-0.031-0.533-0.061-0.801-0.087c-0.074-0.007-0.149-0.012-0.224-0.02c-0.317-0.029-0.636-0.057-0.953-0.08c-0.123-0.009-0.248-0.016-0.371-0.023c-0.272-0.018-0.547-0.037-0.819-0.049c-0.146-0.008-0.29-0.012-0.434-0.017l-0.001,29.444v0.115c1.517,0.157,3.02,0.48,4.478,0.975l21.754-21.754C122.338,145.729,121.521,145.185,120.681,144.675z"
        />
        <path
          fill="#4D5A31"
          d="M144.458,184.631c-0.014-0.265-0.03-0.529-0.048-0.795c-0.008-0.132-0.015-0.263-0.026-0.397c-0.022-0.311-0.048-0.623-0.077-0.934c-0.006-0.081-0.014-0.161-0.021-0.242c-0.034-0.348-0.071-0.696-0.111-1.043c-0.004-0.028-0.007-0.056-0.01-0.084c-0.002-0.013-0.003-0.027-0.005-0.04c-0.046-0.375-0.096-0.75-0.149-1.124c-0.001-0.011-0.002-0.025-0.005-0.035c-0.339-2.351-0.847-4.681-1.524-6.972c-0.005-0.016-0.009-0.03-0.014-0.044c-0.107-0.356-0.216-0.71-0.328-1.063c-0.015-0.046-0.031-0.093-0.045-0.14c-0.105-0.319-0.211-0.636-0.321-0.954c-0.031-0.085-0.061-0.171-0.091-0.258c-0.097-0.275-0.197-0.549-0.299-0.823c-0.049-0.131-0.099-0.261-0.15-0.391c-0.086-0.227-0.175-0.454-0.265-0.678c-0.072-0.18-0.144-0.357-0.218-0.534c-0.072-0.176-0.146-0.35-0.22-0.526c-0.097-0.224-0.195-0.448-0.294-0.671c-0.056-0.125-0.112-0.252-0.17-0.378c-0.122-0.266-0.247-0.532-0.373-0.797c-0.039-0.08-0.077-0.162-0.116-0.242c-0.147-0.303-0.296-0.606-0.448-0.906c-0.022-0.041-0.043-0.083-0.065-0.125c-0.17-0.331-0.344-0.663-0.521-0.99c-0.007-0.011-0.012-0.024-0.019-0.035c-0.859-1.58-1.802-3.108-2.822-4.578l-21.761,21.762c0.495,1.459,0.817,2.961,0.974,4.477h0.116h29.444C144.469,184.922,144.465,184.776,144.458,184.631z"
        />
        <path
          fill="#6BA43A"
          d="M115.03,187.069c0,0.334-0.031,0.666-0.048,1c-0.016,0.334-0.022,0.668-0.055,1c-0.381,3.84-1.863,7.59-4.446,10.74c-0.21,0.256-0.447,0.496-0.672,0.743c-0.224,0.247-0.432,0.504-0.671,0.742l20.851,20.85c0.237-0.237,0.46-0.482,0.691-0.723c0.231-0.241,0.466-0.479,0.691-0.723c1.543-1.671,2.953-3.419,4.224-5.236c0.051-0.072,0.099-0.143,0.148-0.214c0.155-0.223,0.306-0.448,0.458-0.673c0.133-0.201,0.266-0.402,0.395-0.605c0.064-0.097,0.128-0.198,0.19-0.295c4.782-7.509,7.341-16.021,7.685-24.607c0.013-0.333,0.02-0.667,0.027-1c0.007-0.333,0.017-0.666,0.017-1H115.03z"
        />
        <path
          fill="#4D5A31"
          d="M59.838,151.994c-0.237,0.237-0.461,0.482-0.692,0.722c-0.231,0.24-0.466,0.479-0.692,0.723c-1.538,1.665-2.944,3.409-4.212,5.22c-0.061,0.085-0.122,0.174-0.182,0.261c-0.143,0.208-0.284,0.416-0.423,0.625c-0.145,0.217-0.289,0.437-0.429,0.656c-0.053,0.08-0.105,0.161-0.156,0.241c-4.789,7.513-7.355,16.034-7.7,24.627c-0.013,0.333-0.02,0.667-0.027,1c-0.007,0.333-0.017,0.667-0.017,1l29.488,0c0-0.334,0.031-0.666,0.048-1c0.017-0.334,0.022-0.668,0.055-1c0.381-3.84,1.863-7.589,4.447-10.739c0.21-0.256,0.447-0.496,0.672-0.743c0.224-0.247,0.432-0.504,0.671-0.742L59.838,151.994z"
        />
        <path
          fill="#4D5A31"
          d="M107.642,202.627c-0.229,0.185-0.461,0.366-0.697,0.54l0.052,0.087l15.202,25.235c0.704-0.46,1.4-0.934,2.08-1.432c1.471-1.085,2.895-2.261,4.267-3.527l-20.821-20.821L107.642,202.627z"
        />
        <path
          fill="#82B536"
          d="M82.185,171.512c0.23-0.186,0.462-0.366,0.697-0.54l-0.052-0.087l-15.201-25.235c-0.706,0.461-1.404,0.936-2.085,1.436c-1.47,1.082-2.893,2.257-4.262,3.522l20.821,20.821L82.185,171.512z"
        />
      </g>
      <path
        fill="currentColor"
        d="M153.276,128.706c-5.395-5.395-14.142-5.395-19.536,0c-4.304,4.303-5.164,10.736-2.601,15.902L101.048,174.7c-5.166-2.562-11.599-1.703-15.903,2.6c-5.395,5.395-5.394,14.142,0,19.537c5.396,5.395,14.143,5.393,19.538-0.001c4.303-4.303,5.162-10.736,2.599-15.903l30.091-30.091c5.167,2.562,11.599,1.703,15.902-2.601C158.67,142.849,158.67,134.101,153.276,128.706z"
      />
    </svg>
  );
}

/** Official AsyncAPI mark (rounded rect with chevron arrows) */
function AsyncApiIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="12 12 137.7 137.7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M117.12,12H44.53A32.58,32.58,0,0,0,12,44.53v72.59A32.58,32.58,0,0,0,44.53,149.7h72.59a32.58,32.58,0,0,0,32.58-32.58V44.53A32.58,32.58,0,0,0,117.12,12Zm-4.84,88.28c0,13.26-14.13,24-31.49,24s-31.48-10.79-31.48-24V100h7v.27c0,9.42,11,17.07,24.5,17.07s24.51-7.65,24.51-17.07V100h7ZM88.66,89.68l-4.1,5.65-.22-.16-32-23.24,4.1-5.65.22.16ZM73,71.93l4.1-5.65.22.16,32,23.24-4.1,5.65-.22-.16Zm39.31-10.25h-7v-.26c0-9.42-11-17.08-24.51-17.08S56.35,52,56.35,61.42v.26h-7v-.26c0-13.27,14.12-24.06,31.48-24.06s31.48,10.79,31.48,24.06Z"
      />
    </svg>
  );
}

const SPEC_FILE_EXTENSION_RE = /\.(json|ya?ml)$/i;

function generateWorkspaceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}
const SAMPLE_EVENT_SYSTEM_INDEX = 8;

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Unable to read ${file.name}`));
    reader.readAsText(file);
  });
}

function toUniqueFileName(fileName: string, existing: Set<string>): string {
  const trimmed = fileName.trim() || "spec.yml";
  const dotIndex = trimmed.lastIndexOf(".");
  const base = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const ext = dotIndex > 0 ? trimmed.slice(dotIndex) : "";
  let candidate = trimmed;
  let sequence = 2;

  while (existing.has(candidate.toLowerCase())) {
    candidate = `${base}-${sequence}${ext}`;
    sequence += 1;
  }

  existing.add(candidate.toLowerCase());
  return candidate;
}

function toPascalIdentifierSeed(rawValue: string): string {
  return rawValue
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function extractOpenApiTitle(source: string): string | null {
  try {
    const parsed = JSON.parse(source);
    const title = parsed?.info?.title;
    if (typeof title === "string" && title.trim().length > 0) {
      return title.trim();
    }
  } catch {}

  const infoBlockMatch = source.match(
    /(^|\n)([ \t]*)info\s*:\s*(?:\n|\r\n)((?:\2[ \t]+.*(?:\n|\r\n)?)+)/,
  );
  const infoBody = infoBlockMatch?.[3];
  if (!infoBody) return null;

  const titleLineMatch = infoBody.match(/^[ \t]*title\s*:\s*(.+?)\s*$/m);
  if (!titleLineMatch?.[1]) return null;

  const cleanedTitle = titleLineMatch[1]
    .replace(/\s+#.*$/, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return cleanedTitle.length > 0 ? cleanedTitle : null;
}

function toServiceIdentifier(
  fileName: string,
  kind: SpecKind,
  existing: Set<string>,
  preferredName?: string | null,
): string {
  const base = fileName.replace(/\.[^./\\]+$/, "");
  const raw =
    toPascalIdentifierSeed(preferredName?.trim() || "") ||
    toPascalIdentifierSeed(base);

  let candidate = raw || (kind === "openapi" ? "OpenApi" : "AsyncApi");

  if (/^\d/.test(candidate)) {
    candidate = `Spec${candidate}`;
  }

  let unique = candidate;
  let sequence = 2;
  while (existing.has(unique)) {
    unique = `${candidate}${sequence}`;
    sequence += 1;
  }

  existing.add(unique);
  return unique;
}

function buildMainEcFile(
  kind: SpecKind,
  imports: string[],
  serviceNames: string[],
  importedSpecFiles: string[],
): string {
  const workspaceName =
    kind === "openapi" ? "REST Service Workspace" : "Event Flow Workspace";
  const visualizerEntries =
    serviceNames.length > 0
      ? serviceNames.map((service) => `  service ${service}`)
      : ["  // Add services here"];
  return [
    ...imports,
    "",
    "visualizer main {",
    `  name "${workspaceName}"`,
    ...visualizerEntries,
    "}",
    "",
  ].join("\n");
}

export default function Landing() {
  const navigate = useNavigate();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [activeDropKind, setActiveDropKind] = useState<SpecKind | null>(null);
  const [isImportingSpecs, setIsImportingSpecs] = useState(false);
  const [importingSpecKind, setImportingSpecKind] = useState<SpecKind | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const openApiInputRef = useRef<HTMLInputElement>(null);
  const asyncApiInputRef = useRef<HTMLInputElement>(null);

  // Force dark theme for the landing page so visualizer + editor render dark
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  useEffect(() => {
    // Scroll reveal observer
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: "0px 0px -60px 0px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const selectors = [
      ".reveal",
      ".reveal-left",
      ".reveal-right",
      ".reveal-scale",
      ".stagger-children",
      ".comp-slide-left",
      ".comp-slide-right",
      ".comp-arrow-anim",
      ".landing .divider",
    ];

    document.querySelectorAll(selectors.join(",")).forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const closeWorkspaceModal = useCallback(() => {
    if (isImportingSpecs) return;
    setIsWorkspaceModalOpen(false);
    setActiveDropKind(null);
  }, [isImportingSpecs]);

  useEffect(() => {
    if (!isWorkspaceModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWorkspaceModal();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeWorkspaceModal, isWorkspaceModalOpen]);

  const importSpecsIntoWorkspace = useCallback(
    async (kind: SpecKind, incomingFiles: File[]) => {
      const specFiles = incomingFiles.filter((file) =>
        SPEC_FILE_EXTENSION_RE.test(file.name),
      );

      if (specFiles.length === 0) {
        setImportError(
          "Select one or more .yaml, .yml, or .json specification files.",
        );
        return;
      }

      setImportError(null);
      setIsImportingSpecs(true);
      setImportingSpecKind(kind);

      try {
        const usedFileNames = new Set<string>();
        const namedFiles = specFiles.map((file) => ({
          originalFile: file,
          fileName: toUniqueFileName(file.name, usedFileNames),
        }));

        const fileEntries = await Promise.all(
          namedFiles.map(async (file) => ({
            fileName: file.fileName,
            content: await readFileAsText(file.originalFile),
          })),
        );

        const usedServiceNames = new Set<string>();
        const imports: string[] = [];
        const serviceNames: string[] = [];
        const specFileEntries: Record<string, string> = {};

        for (const file of fileEntries) {
          const preferredServiceName = extractOpenApiTitle(file.content);
          const serviceName = toServiceIdentifier(
            file.fileName,
            kind,
            usedServiceNames,
            preferredServiceName,
          );
          imports.push(`import ${serviceName} from "./${file.fileName}"`);
          serviceNames.push(serviceName);
          specFileEntries[file.fileName] = file.content;
        }

        // main.ec first so it appears as the first tab
        const workspaceFiles: Record<string, string> = {};
        workspaceFiles["main.ec"] = buildMainEcFile(
          kind,
          imports,
          serviceNames,
          fileEntries.map((file) => file.fileName),
        );
        Object.assign(workspaceFiles, specFileEntries);

        // Generate a workspace ID and persist via the store
        const wsId = generateWorkspaceId();
        const specTitle =
          extractOpenApiTitle(fileEntries[0]?.content ?? "") ??
          fileEntries[0]?.fileName ??
          "Imported Spec";
        createWorkspace({
          id: wsId,
          files: workspaceFiles,
          activeFile: "main.ec",
          title: specTitle,
          kind,
          services: serviceNames,
        });

        setIsWorkspaceModalOpen(false);
        setActiveDropKind(null);
        navigate(`/playground/${wsId}`);
      } catch {
        setImportError(
          "Unable to import the selected specs. Please try again.",
        );
      } finally {
        setIsImportingSpecs(false);
        setImportingSpecKind(null);
      }
    },
    [navigate],
  );

  const openPlayground = (e: React.MouseEvent) => {
    e.preventDefault();
    setImportError(null);
    setIsWorkspaceModalOpen(true);
  };

  const handleDrop = useCallback(
    (kind: SpecKind, event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (isImportingSpecs) return;
      setActiveDropKind(null);
      void importSpecsIntoWorkspace(
        kind,
        Array.from(event.dataTransfer.files || []),
      );
    },
    [importSpecsIntoWorkspace, isImportingSpecs],
  );

  const handleFileInputChange = useCallback(
    (kind: SpecKind, event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      void importSpecsIntoWorkspace(kind, files);
    },
    [importSpecsIntoWorkspace],
  );

  const triggerFilePicker = useCallback(
    (kind: SpecKind) => {
      if (isImportingSpecs) return;
      setImportError(null);
      if (kind === "openapi") {
        openApiInputRef.current?.click();
        return;
      }
      asyncApiInputRef.current?.click();
    },
    [isImportingSpecs],
  );

  const openSampleWorkspace = useCallback(() => {
    if (isImportingSpecs) return;
    setIsWorkspaceModalOpen(false);
    setActiveDropKind(null);
    navigate(`/playground#example=${SAMPLE_EVENT_SYSTEM_INDEX}`);
  }, [isImportingSpecs, navigate]);

  return (
    <div className="landing">
      {/* Nav */}
      <nav>
        <div className="nav-left">
          <a href="https://eventcatalog.dev" className="nav-brand">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon
                points="12 2.5 14.12 14.12 12 12 9.88 14.12"
                fill="#ef4444"
                stroke="#ef4444"
                strokeWidth="0.5"
              />
              <polygon
                points="12 21.5 9.88 9.88 12 12 14.12 9.88"
                fill="currentColor"
                opacity="0.3"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </svg>
            EventCatalog
          </a>
          <div className="nav-divider"></div>
          <span className="nav-product">
            Compass<span className="nav-badge">Preview</span>
          </span>
        </div>
        <div className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#usecases">Use Cases</a>
          <a href="https://eventcatalog.dev/docs">Docs</a>
          <a
            href="https://github.com/event-catalog"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a href="/playground" className="nav-cta" onClick={openPlayground}>
            Open Playground
          </a>
        </div>
      </nav>

      {isWorkspaceModalOpen && (
        <div
          className="workspace-modal-overlay"
          role="presentation"
          onClick={closeWorkspaceModal}
        >
          <div
            className="workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-modal-header">
              <div>
                <h2 id="workspace-modal-title">Get Started</h2>
                <p>
                  Import your specs, explore a sample, or start with a blank
                  canvas.
                </p>
              </div>
              <button
                type="button"
                className="workspace-modal-close"
                aria-label="Close create workspace modal"
                onClick={closeWorkspaceModal}
                disabled={isImportingSpecs}
              >
                <X size={16} />
              </button>
            </div>

            <section className="workspace-modal-section">
              <div className="workspace-modal-section-header">
                <h3>Import Your Specs</h3>
                <p>
                  Drag and drop or browse. Import multiple specs into one
                  workspace.
                </p>
              </div>
              <div className="workspace-modal-grid workspace-modal-grid-two">
                <article
                  className={`workspace-option-card workspace-option-card--openapi${activeDropKind === "openapi" ? " is-dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (isImportingSpecs) return;
                    event.dataTransfer.dropEffect = "copy";
                    setActiveDropKind("openapi");
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (isImportingSpecs) return;
                    setActiveDropKind("openapi");
                  }}
                  onDragLeave={() => setActiveDropKind(null)}
                  onDrop={(event) => handleDrop("openapi", event)}
                >
                  <div className="workspace-option-card-body">
                    <div className="workspace-option-card-icon workspace-option-card-icon--openapi">
                      <OpenApiIcon size={20} />
                    </div>
                    <h4>OpenAPI</h4>
                    <p>Visualize your REST services and their relationships.</p>
                  </div>
                  <div className="workspace-option-card-drop-hint">
                    <Upload size={16} />
                    <span>Drop files here or click below</span>
                  </div>
                  <div className="workspace-option-card-footer">
                    <span className="workspace-option-card-meta">
                      .yaml, .yml, .json
                    </span>
                    <button
                      type="button"
                      className="workspace-option-card-cta"
                      onClick={() => triggerFilePicker("openapi")}
                      disabled={isImportingSpecs}
                    >
                      {isImportingSpecs && importingSpecKind === "openapi"
                        ? "Importing..."
                        : "Upload files"}
                    </button>
                  </div>
                </article>

                <article
                  className={`workspace-option-card workspace-option-card--asyncapi${activeDropKind === "asyncapi" ? " is-dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (isImportingSpecs) return;
                    event.dataTransfer.dropEffect = "copy";
                    setActiveDropKind("asyncapi");
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (isImportingSpecs) return;
                    setActiveDropKind("asyncapi");
                  }}
                  onDragLeave={() => setActiveDropKind(null)}
                  onDrop={(event) => handleDrop("asyncapi", event)}
                >
                  <div className="workspace-option-card-body">
                    <div className="workspace-option-card-icon workspace-option-card-icon--asyncapi">
                      <AsyncApiIcon size={20} />
                    </div>
                    <h4>AsyncAPI</h4>
                    <p>See how events flow between producers and consumers.</p>
                  </div>
                  <div className="workspace-option-card-drop-hint">
                    <Upload size={16} />
                    <span>Drop files here or click below</span>
                  </div>
                  <div className="workspace-option-card-footer">
                    <span className="workspace-option-card-meta">
                      .yaml, .yml, .json
                    </span>
                    <button
                      type="button"
                      className="workspace-option-card-cta"
                      onClick={() => triggerFilePicker("asyncapi")}
                      disabled={isImportingSpecs}
                    >
                      {isImportingSpecs && importingSpecKind === "asyncapi"
                        ? "Importing..."
                        : "Upload files"}
                    </button>
                  </div>
                </article>
              </div>
            </section>

            {importError && (
              <p className="workspace-modal-error" role="alert">
                {importError}
              </p>
            )}

            <section className="workspace-modal-section workspace-modal-section--secondary">
              <div className="workspace-modal-section-header">
                <h3>Or explore</h3>
              </div>
              <div className="workspace-secondary-options">
                <button
                  type="button"
                  className="workspace-secondary-btn"
                  onClick={openSampleWorkspace}
                  disabled={isImportingSpecs}
                >
                  <Play size={15} />
                  <div>
                    <span className="workspace-secondary-btn-label">
                      Sample event-driven system
                    </span>
                    <span className="workspace-secondary-btn-desc">
                      Domains, services, REST APIs, and async channels
                    </span>
                  </div>
                </button>

                <div
                  className="workspace-secondary-btn workspace-secondary-btn--disabled"
                  aria-disabled="true"
                >
                  <Link2 size={15} />
                  <div>
                    <span className="workspace-secondary-btn-label">
                      Connect to EventCatalog project
                    </span>
                    <span className="workspace-secondary-btn-desc">
                      Sync specs from an existing workspace
                    </span>
                  </div>
                  <span className="workspace-secondary-btn-badge">Soon</span>
                </div>
              </div>
            </section>

            <input
              ref={openApiInputRef}
              type="file"
              className="workspace-file-input"
              multiple
              accept=".yaml,.yml,.json"
              onChange={(event) => handleFileInputChange("openapi", event)}
            />
            <input
              ref={asyncApiInputRef}
              type="file"
              className="workspace-file-input"
              multiple
              accept=".yaml,.yml,.json"
              onChange={(event) => handleFileInputChange("asyncapi", event)}
            />

            <p className="workspace-modal-privacy">
              Your data stays in your browser. Nothing is uploaded or stored on
              our servers.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="dot"></span>
          Now in preview
        </div>
        <h1>
          You have the specs.
          <br />
          <span className="highlight">See the architecture.</span>
        </h1>
        <p className="hero-sub">
          Import your AsyncAPI and OpenAPI files, see how services connect, and
          export straight to EventCatalog.
        </p>
        <div className="hero-actions">
          <a
            href="/playground"
            className="btn-primary"
            onClick={openPlayground}
          >
            Open Playground &rarr;
          </a>
          <a href="#how" className="btn-ghost">
            How it works
          </a>
        </div>

        {/* Editor Preview — live playground */}
        <HeroPreview />

        {/* Value props row */}
        <div className="hero-pillars">
          <div className="hero-pillar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="20"
              height="20"
            >
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div>
              <strong>DSL for architecture</strong>
              <span>
                Define domains, services, messages, and channels in one readable
                language
              </span>
            </div>
          </div>
          <div className="hero-pillar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="20"
              height="20"
            >
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <strong>Model with your specifications</strong>
              <span>
                Import messages, operations, and channels from your specs and
                model your architecture
              </span>
            </div>
          </div>
          <div className="hero-pillar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="20"
              height="20"
            >
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <strong>Export to documentation</strong>
              <span>
                Turns your architecture artifacts into documentation portal for
                your teams
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="logos-section">
        <div className="logos-label">EventCatalog is trusted by teams at</div>
        <div className="logos-row">
          <span>Nike</span>
          <span>GOV.UK</span>
          <span>AWS</span>
          <span>Ticketmaster</span>
          <span>Eurostar</span>
          <span>M&amp;S</span>
          <span>TUI</span>
          <span>Mazda</span>
        </div>
      </section>

      <div className="divider"></div>

      {/* Problem */}
      <section className="section section-center">
        <div className="section-label section-label-red reveal">
          The Problem
        </div>
        <h2 className="section-title reveal">Your architecture is invisible</h2>
        <p className="section-desc reveal">
          Specs describe individual APIs. Diagrams go stale. The full picture
          lives in someone's head.
        </p>
        <div className="bento-grid stagger-children">
          {/* Row 1: Wide + 2 regular */}
          <div className="bento-card bento-col-2">
            <div className="bento-text">
              <div className="bento-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Specs in silos</span>
              </div>
              <p>
                AsyncAPI, OpenAPI, Avro. Each describes one piece.
                <br />
                <strong>None shows how they connect.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Scattered file cards with no connections */}
              <div className="bento-files-scatter">
                <div
                  className="bento-file-card"
                  style={{ top: "8%", left: "5%" }}
                >
                  <div className="bento-file-dot bento-file-dot-cyan"></div>
                  <span>orders-asyncapi.yml</span>
                </div>
                <div
                  className="bento-file-card"
                  style={{ top: "8%", right: "8%" }}
                >
                  <div className="bento-file-dot bento-file-dot-green"></div>
                  <span>payments-openapi.yml</span>
                </div>
                <div
                  className="bento-file-card"
                  style={{ bottom: "24%", left: "12%" }}
                >
                  <div className="bento-file-dot bento-file-dot-cyan"></div>
                  <span>inventory-asyncapi.yml</span>
                </div>
                <div
                  className="bento-file-card"
                  style={{ bottom: "24%", right: "5%" }}
                >
                  <div className="bento-file-dot bento-file-dot-green"></div>
                  <span>shipping-openapi.yml</span>
                </div>
                {/* Dashed lines that go nowhere */}
                <svg
                  className="bento-scatter-lines"
                  viewBox="0 0 400 200"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="120"
                    y1="40"
                    x2="200"
                    y2="100"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />
                  <line
                    x1="280"
                    y1="40"
                    x2="200"
                    y2="100"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />
                  <line
                    x1="140"
                    y1="150"
                    x2="200"
                    y2="100"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <line
                    x1="300"
                    y1="150"
                    x2="200"
                    y2="100"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <circle
                    cx="200"
                    cy="100"
                    r="3"
                    fill="var(--text-muted)"
                    opacity="0.3"
                  />
                </svg>
                <div className="bento-scatter-label">No connections</div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--cyan)"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                >
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Stale diagrams</span>
              </div>
              <p>
                That Miro board was accurate last quarter.
                <br />
                <strong>Now it's misleading anyone who trusts it.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Faded diagram mockup */}
              <div className="bento-stale-diagram">
                <div
                  className="bento-stale-node"
                  style={{ top: "10%", left: "25%" }}
                ></div>
                <div
                  className="bento-stale-node"
                  style={{ top: "10%", right: "25%" }}
                ></div>
                <div
                  className="bento-stale-node"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                ></div>
                <svg
                  className="bento-stale-lines"
                  viewBox="0 0 200 120"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="60"
                    y1="25"
                    x2="140"
                    y2="25"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.3"
                  />
                  <line
                    x1="60"
                    y1="25"
                    x2="100"
                    y2="70"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.3"
                  />
                  <line
                    x1="140"
                    y1="25"
                    x2="100"
                    y2="70"
                    stroke="var(--border-hover)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.3"
                  />
                </svg>
                <div className="bento-stale-stamp">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="14"
                    height="14"
                  >
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>6 months ago</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                >
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Tribal knowledge</span>
              </div>
              <p>
                The real architecture lives in one person's head.
                <br />
                <strong>When they leave, it leaves with them.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Person with knowledge radiating out */}
              <div className="bento-tribal-viz">
                <div className="bento-tribal-person">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1"
                    width="40"
                    height="40"
                    opacity="0.6"
                  >
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="bento-tribal-bubbles">
                  <span style={{ animationDelay: "0s" }}>OrderService</span>
                  <span style={{ animationDelay: "0.6s" }}>OrderCreated</span>
                  <span style={{ animationDelay: "1.2s" }}>PaymentAPI</span>
                  <span style={{ animationDelay: "1.8s" }}>kafka.orders</span>
                  <span style={{ animationDelay: "2.4s" }}>ShipmentFlow</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 3 regular cards */}
          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                >
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Slow onboarding</span>
              </div>
              <p>
                New engineers spend days asking around.
                <br />
                <strong>"Who owns this event? Where does it go?"</strong>
              </p>
            </div>
            <div className="bento-viz">
              <div className="bento-onboarding-viz">
                <div className="bento-chat-bubble bento-chat-q">
                  Who owns OrderCreated?
                </div>
                <div className="bento-chat-bubble bento-chat-a">
                  Maybe the orders team?
                </div>
                <div className="bento-chat-bubble bento-chat-q">
                  Where does it publish to?
                </div>
                <div className="bento-chat-bubble bento-chat-a">
                  Check with Sarah
                </div>
                <div className="bento-chat-bubble bento-chat-q">
                  Is this still in use?
                </div>
                <div className="bento-chat-bubble bento-chat-a">No idea</div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--yellow)"
                  strokeWidth="1.5"
                  width="20"
                  height="20"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No source of truth</span>
              </div>
              <p>
                Wiki, Confluence, Notion, Slack threads.
                <br />
                <strong>Five sources. Five different answers.</strong>
              </p>
            </div>
            <div className="bento-viz">
              <div className="bento-sources-viz">
                <div className="bento-source-row">
                  <div className="bento-source-pill">Wiki</div>
                  <span className="bento-source-val">v2.1 (REST)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Confluence</div>
                  <span className="bento-source-val">v1.3 (gRPC)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Notion</div>
                  <span className="bento-source-val">v2.0 (Kafka)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Slack</div>
                  <span className="bento-source-val">
                    "I think it's deprecated?"
                  </span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">README</div>
                  <span className="bento-source-val">Last updated 2023</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Full-width before/after */}
          <div className="bento-card bento-col-3">
            <div className="bento-before-after">
              <div className="bento-ba-side">
                <div className="bento-ba-label">Today</div>
                <div className="bento-ba-content">
                  <div className="bento-ba-files">
                    <code>orders-asyncapi.yml</code>
                    <code>payments-openapi.yml</code>
                    <code>inventory-asyncapi.yml</code>
                    <code>shipping-openapi.yml</code>
                  </div>
                  <span className="bento-ba-note">
                    No view of how they connect
                  </span>
                </div>
              </div>
              <div className="bento-ba-arrow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="24"
                  height="24"
                >
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="bento-ba-side bento-ba-after">
                <div className="bento-ba-label bento-ba-label-green">
                  With Compass
                </div>
                <div className="bento-ba-content">
                  <div className="bento-ba-files">
                    <code>
                      <span className="kw">import from</span>{" "}
                      <span className="str">"./orders-asyncapi.yml"</span>
                    </code>
                    <code>
                      <span className="kw">import from</span>{" "}
                      <span className="str">"./payments-openapi.yml"</span>
                    </code>
                    <code>
                      <span className="kw">import from</span>{" "}
                      <span className="str">"./inventory-asyncapi.yml"</span>
                    </code>
                    <code>
                      <span className="kw">import from</span>{" "}
                      <span className="str">"./shipping-openapi.yml"</span>
                    </code>
                  </div>
                  <span className="bento-ba-note bento-ba-note-green">
                    Full architecture view, instantly
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="bento-statement reveal">
          <strong>Your specs already describe the pieces.</strong> Compass
          connects them into the full picture.
        </p>
      </section>

      <div className="divider"></div>

      {/* How It Works */}
      <section className="section" id="how">
        <div className="section-label reveal">How It Works</div>
        <h2 className="section-title reveal">
          Specs to architecture in three steps
        </h2>
        <p className="section-desc reveal">Import. Compose. Visualize.</p>
        <div className="steps stagger-children">
          <div className="step">
            <div className="step-head">
              <div className="step-num">1</div>
              <h3>Import your specs</h3>
            </div>
            <div className="step-body">
              <p>
                Import events, operations, and channels from your existing
                AsyncAPI and OpenAPI files. Pick specific resources or bring in
                an entire spec at once.
              </p>
              <div className="code-block">
                <pre>
                  <span className="cm">{"// Import specific resources"}</span>
                  {"\n"}
                  <span className="kw">import events</span>{" "}
                  <span className="br">{"{"}</span>{" "}
                  <span className="ref">OrderCreated</span>,{" "}
                  <span className="ref">OrderShipped</span>{" "}
                  <span className="br">{"}"}</span>{" "}
                  <span className="kw">from</span>{" "}
                  <span className="str">"./asyncapi.yml"</span>
                  {"\n"}
                  <span className="kw">import operations</span>{" "}
                  <span className="br">{"{"}</span>{" "}
                  <span className="ref">CreateOrder</span>{" "}
                  <span className="br">{"}"}</span>{" "}
                  <span className="kw">from</span>{" "}
                  <span className="str">"./openapi.yml"</span>
                  {"\n\n"}
                  <span className="cm">{"// Or import everything"}</span>
                  {"\n"}
                  <span className="kw">import from</span>{" "}
                  <span className="str">"./orders-asyncapi.yml"</span>
                </pre>
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-head">
              <div className="step-num">2</div>
              <h3>Compose the architecture</h3>
            </div>
            <div className="step-body">
              <p>
                Add domains, ownership, and the context that specs alone can't
                capture.
              </p>
              <div className="code-block">
                <pre>
                  <span className="cm">
                    {"// Group services into a business domain"}
                  </span>
                  {"\n"}
                  <span className="kw">domain</span>{" "}
                  <span className="fn">OrderManagement</span>{" "}
                  <span className="br">{"{"}</span>
                  {"\n"}
                  {"  "}
                  <span className="kw">version</span>{" "}
                  <span className="str">1.0.0</span>
                  {"\n\n"}
                  {"  "}
                  <span className="cm">
                    {"// Assign ownership and wire up messaging"}
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="kw">service</span>{" "}
                  <span className="fn">OrderService</span>{" "}
                  <span className="br">{"{"}</span>
                  {"\n"}
                  {"    "}
                  <span className="kw">owners</span>{" "}
                  <span className="ref">@order-team</span>
                  {"\n"}
                  {"    "}
                  <span className="kw">sends event</span>{" "}
                  <span className="ref">OrderCreated</span>{" "}
                  <span className="kw">to</span>{" "}
                  <span className="ref">OrderStream</span>
                  {"\n"}
                  {"  "}
                  <span className="br">{"}"}</span>
                  {"\n\n"}
                  {"  "}
                  <span className="cm">
                    {"// Define consumers — Compass maps the dependency"}
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="kw">service</span>{" "}
                  <span className="fn">PaymentService</span>{" "}
                  <span className="br">{"{"}</span>
                  {"\n"}
                  {"    "}
                  <span className="kw">receives event</span>{" "}
                  <span className="ref">OrderCreated</span>{" "}
                  <span className="kw">from</span>{" "}
                  <span className="ref">OrderStream</span>
                  {"\n"}
                  {"  "}
                  <span className="br">{"}"}</span>
                  {"\n"}
                  <span className="br">{"}"}</span>
                </pre>
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-head">
              <div className="step-num">3</div>
              <h3>Visualize and share</h3>
            </div>
            <div className="step-body">
              <p>
                Your architecture renders as you type. Share a link so everyone
                sees the same picture. When you're ready, export to EventCatalog
                for full documentation.
              </p>
              <StepVisualizer />
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Sources */}
      <section className="section section-center">
        <div className="section-label reveal">Import From Anywhere</div>
        <h2 className="section-title reveal">Your specs. One architecture.</h2>
        <p className="section-desc reveal">
          Start with local files today. Connect to registries as your needs
          grow.
        </p>
        <div className="sources-grid stagger-children">
          <div className="source-card">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--cyan)"
                strokeWidth="1.5"
              >
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M9 13h6m-6 3h4" />
              </svg>
            </div>
            <h4>AsyncAPI</h4>
            <span className="source-detail">Events, channels</span>
          </div>
          <div className="source-card">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--green)"
                strokeWidth="1.5"
              >
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M10 12l2 2 4-4" />
              </svg>
            </div>
            <h4>OpenAPI</h4>
            <span className="source-detail">Operations, endpoints</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h4>Confluent</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h4>AWS</h4>
            <span className="source-detail">EventBridge, Glue</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
            </div>
            <h4>Solace</h4>
            <span className="source-detail">Queues, topics</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h4>GitHub</h4>
            <span className="source-detail">Private repos</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h4>Apicurio</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              >
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h4>Azure</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Use Cases */}
      <section className="section section-center" id="usecases">
        <div className="section-label reveal">Built For Architects</div>
        <h2 className="section-title reveal">How teams can use Compass</h2>
        <div className="usecases-grid stagger-children">
          <div className="usecase-card">
            <div className="usecase-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3>Architecture discovery</h3>
            </div>
            <p>
              Import spec files and see how services connect across your system.
              <br />
              <strong>
                New engineers get the full picture in minutes, not weeks.
              </strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-discovery">
                <div
                  className="uc-node uc-node-service"
                  style={{
                    top: "20%",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  OrderService
                </div>
                <div
                  className="uc-node uc-node-event"
                  style={{ bottom: "20%", left: "15%" }}
                >
                  OrderCreated
                </div>
                <div
                  className="uc-node uc-node-event"
                  style={{ bottom: "20%", right: "15%" }}
                >
                  PaymentProcessed
                </div>
                <svg
                  className="uc-lines"
                  viewBox="0 0 300 120"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="150"
                    y1="35"
                    x2="65"
                    y2="85"
                    stroke="var(--cyan)"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                  <line
                    x1="150"
                    y1="35"
                    x2="235"
                    y2="85"
                    stroke="var(--cyan)"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <h3>Design and planning</h3>
            </div>
            <p>
              Import current state from specs, sketch proposed changes inline.
              <br />
              <strong>Compare before and after in one view.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-design">
                <div className="uc-design-col">
                  <span className="uc-design-label">Before</span>
                  <div className="uc-design-block"></div>
                  <div className="uc-design-block"></div>
                </div>
                <div className="uc-design-arrow">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="16"
                    height="16"
                  >
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <div className="uc-design-col">
                  <span className="uc-design-label uc-design-label-new">
                    After
                  </span>
                  <div className="uc-design-block uc-design-block-new"></div>
                  <div className="uc-design-block uc-design-block-new"></div>
                  <div className="uc-design-block uc-design-block-added"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>Impact analysis</h3>
            </div>
            <p>
              Deprecating an event? Import your specs and see every service that
              depends on it.
              <br />
              <strong>No more chasing down five different teams.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-impact">
                <svg className="uc-impact-svg" viewBox="0 0 280 140">
                  {/* Lines from center to deps */}
                  <line
                    className="uc-impact-line"
                    x1="140"
                    y1="70"
                    x2="40"
                    y2="25"
                  />
                  <line
                    className="uc-impact-line"
                    x1="140"
                    y1="70"
                    x2="240"
                    y2="25"
                  />
                  <line
                    className="uc-impact-line"
                    x1="140"
                    y1="70"
                    x2="50"
                    y2="118"
                  />
                  <line
                    className="uc-impact-line"
                    x1="140"
                    y1="70"
                    x2="230"
                    y2="118"
                  />
                  {/* Center node */}
                  <rect
                    x="90"
                    y="55"
                    width="100"
                    height="30"
                    rx="6"
                    className="uc-impact-center-bg"
                  />
                  <text
                    x="140"
                    y="74"
                    textAnchor="middle"
                    className="uc-impact-center-text"
                  >
                    OrderCreated
                  </text>
                  {/* Dep nodes */}
                  <rect
                    x="2"
                    y="12"
                    width="76"
                    height="26"
                    rx="4"
                    className="uc-impact-dep-bg"
                  />
                  <text
                    x="40"
                    y="29"
                    textAnchor="middle"
                    className="uc-impact-dep-text"
                  >
                    Payments
                  </text>
                  <rect
                    x="202"
                    y="12"
                    width="76"
                    height="26"
                    rx="4"
                    className="uc-impact-dep-bg"
                  />
                  <text
                    x="240"
                    y="29"
                    textAnchor="middle"
                    className="uc-impact-dep-text"
                  >
                    Shipping
                  </text>
                  <rect
                    x="2"
                    y="105"
                    width="96"
                    height="26"
                    rx="4"
                    className="uc-impact-dep-bg"
                  />
                  <text
                    x="50"
                    y="122"
                    textAnchor="middle"
                    className="uc-impact-dep-text"
                  >
                    Notifications
                  </text>
                  <rect
                    x="182"
                    y="105"
                    width="96"
                    height="26"
                    rx="4"
                    className="uc-impact-dep-bg"
                  />
                  <text
                    x="230"
                    y="122"
                    textAnchor="middle"
                    className="uc-impact-dep-text"
                  >
                    Analytics
                  </text>
                </svg>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3>AI-ready architecture</h3>
            </div>
            <p>
              Export to EventCatalog and use the MCP server to let AI agents
              query your architecture.
              <br />
              <strong>
                Ask questions, trace dependencies, and evolve your system with
                AI.
              </strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-ai">
                <div className="uc-ai-prompt">
                  <span className="uc-ai-caret">&gt;</span> Which services
                  depend on OrderCreated?
                </div>
                <div className="uc-ai-response">
                  <span>
                    PaymentService, ShippingService, NotificationService
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* CTA */}
      <section className="cta-hero">
        <h2 className="cta-hero-title reveal">
          See your architecture in 30 seconds
        </h2>
        <p className="cta-hero-desc reveal">
          No signup. No install. Just paste a spec and see it come to life.
        </p>
        <div className="cta-hero-actions reveal">
          <a
            href="/playground"
            className="btn-primary btn-lg"
            onClick={openPlayground}
          >
            Open Playground &rarr;
          </a>
          <a href="https://eventcatalog.dev/docs" className="btn-ghost btn-lg">
            Read the docs
          </a>
        </div>
        <p className="cta-hero-note reveal">
          Free forever &middot; No account required &middot; Exports to
          EventCatalog
        </p>
      </section>

      {/* Footer */}
      <footer className="reveal">
        <span className="footer-brand">
          EventCatalog Compass &middot; Built by{" "}
          <a href="https://twitter.com/boyney123">David Boyne</a>
        </span>
        <div className="footer-links">
          <a href="https://eventcatalog.dev">EventCatalog</a>
          <a href="https://github.com/event-catalog">GitHub</a>
          <a href="https://discord.gg/3rjaZMmrAm">Discord</a>
          <a href="https://twitter.com/event_catalog">Twitter</a>
        </div>
      </footer>
    </div>
  );
}
