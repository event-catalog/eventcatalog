import type { ValidationAcceptor, ValidationChecks } from "langium";
import type {
  EcAstType,
  Program,
  ResourceDefinition,
  DomainDef,
  SubdomainDef,
  ServiceDef,
  SendsStmt,
  ReceivesStmt,
} from "./generated/ast.js";
import type { EcServices } from "./ec-module.js";
import type { AstNode } from "langium";
import {
  isDomainDef,
  isSubdomainDef,
  isServiceDef,
  isUserDef,
  isTeamDef,
  isVisualizerDef,
  isSendsStmt,
  isReceivesStmt,
  isEventDef,
  isCommandDef,
  isQueryDef,
  isChannelDef,
  isContainerDef,
  isDataProductDef,
  isFlowDef,
} from "./generated/ast.js";
import { getVersion } from "./ast-utils.js";

export function registerValidationChecks(services: EcServices): void {
  const registry = services.validation.ValidationRegistry;
  const validator = new EcValidator();
  const checks: ValidationChecks<EcAstType> = {
    Program: [
      validator.checkDuplicateDefinitions,
      validator.checkRequiredVersions,
    ],
  };
  registry.register(checks, validator);
}

export class EcValidator {
  checkDuplicateDefinitions(
    program: Program,
    accept: ValidationAcceptor,
  ): void {
    // Resources are uniquely identified by name + version (cross-type).
    // E.g. event Foo 1.0.0 and query Foo 1.0.0 is a duplicate,
    // but event Foo 1.0.0 and event Foo 2.0.0 is allowed.
    const seen = new Map<string, AstNode>();

    function registerDef(
      def: AstNode & { name: string; body?: AstNode[] },
    ): void {
      const version = def.body ? getVersion(def.body) : undefined;
      const key = version ? `${def.name}@${version}` : def.name;
      if (seen.has(key)) {
        const label = version
          ? `'${def.name}' version ${version}`
          : `'${def.name}'`;
        accept("error", `Duplicate resource definition: ${label}`, {
          node: def,
          property: "name",
        });
      } else {
        seen.set(key, def);
      }
    }

    for (const def of program.definitions) {
      if ("name" in def && typeof def.name === "string") {
        registerDef(def as AstNode & { name: string; body?: AstNode[] });

        // Also check inline definitions nested inside domains/services
        if (isDomainDef(def) || isSubdomainDef(def)) {
          checkNestedDuplicates(def.body, seen, accept);
        }
        if (isServiceDef(def)) {
          checkInlineDuplicates(def.body, seen, accept);
        }
        if (isVisualizerDef(def)) {
          checkVisualizerDuplicates(def.body, seen, accept);
        }
      }
    }
  }

  checkRequiredVersions(program: Program, accept: ValidationAcceptor): void {
    for (const def of program.definitions) {
      checkVersionRecursive(def, accept);
    }
  }
}

function checkNestedDuplicates(
  body: AstNode[],
  seen: Map<string, AstNode>,
  accept: ValidationAcceptor,
): void {
  for (const item of body) {
    if (isServiceDef(item)) {
      const version = getVersion(item.body as AstNode[]);
      const key = version ? `${item.name}@${version}` : item.name;
      if (seen.has(key)) {
        const label = version
          ? `'${item.name}' version ${version}`
          : `'${item.name}'`;
        accept("error", `Duplicate resource definition: ${label}`, {
          node: item,
          property: "name",
        });
      } else {
        seen.set(key, item);
      }
      checkInlineDuplicates(item.body as AstNode[], seen, accept);
    }
    if (isSubdomainDef(item)) {
      const version = getVersion(item.body as AstNode[]);
      const key = version ? `${item.name}@${version}` : item.name;
      if (seen.has(key)) {
        const label = version
          ? `'${item.name}' version ${version}`
          : `'${item.name}'`;
        accept("error", `Duplicate resource definition: ${label}`, {
          node: item,
          property: "name",
        });
      } else {
        seen.set(key, item);
      }
      checkNestedDuplicates(item.body as AstNode[], seen, accept);
    }
  }
}

function checkInlineDuplicates(
  body: AstNode[],
  seen: Map<string, AstNode>,
  accept: ValidationAcceptor,
): void {
  for (const item of body) {
    if ((isSendsStmt(item) || isReceivesStmt(item)) && item.body.length > 0) {
      const version = getVersion(item.body as AstNode[]);
      const key = version ? `${item.messageName}@${version}` : item.messageName;
      if (seen.has(key)) {
        const label = version
          ? `'${item.messageName}' version ${version}`
          : `'${item.messageName}'`;
        accept("error", `Duplicate resource definition: ${label}`, {
          node: item,
          property: "messageName",
        });
      } else {
        seen.set(key, item);
      }
    }
  }
}

function checkVersionRecursive(
  def: ResourceDefinition | SubdomainDef,
  accept: ValidationAcceptor,
): void {
  // Users, teams, and visualizers don't need versions
  if (isUserDef(def) || isTeamDef(def) || isVisualizerDef(def)) {
    // But check inline resources inside visualizers
    if (isVisualizerDef(def)) {
      for (const item of def.body) {
        if (
          isDomainDef(item) ||
          isServiceDef(item) ||
          isChannelDef(item) ||
          isContainerDef(item) ||
          isDataProductDef(item) ||
          isFlowDef(item)
        ) {
          checkVersionRecursive(item, accept);
        }
        if (isEventDef(item) || isCommandDef(item) || isQueryDef(item)) {
          if (item.body && item.body.length > 0) {
            const version = getVersion(item.body as AstNode[]);
            if (!version) {
              const typeName = item.$type.replace("Def", "");
              accept(
                "error",
                `${typeName} '${item.name}' is missing a required 'version' statement`,
                {
                  node: item,
                  property: "name",
                },
              );
            }
          }
        }
      }
    }
    return;
  }

  if ("body" in def && Array.isArray(def.body)) {
    const version = getVersion(def.body as AstNode[]);
    if (!version) {
      const typeName = def.$type.replace("Def", "");
      accept(
        "error",
        `${typeName} '${def.name}' is missing a required 'version' statement`,
        {
          node: def,
          property: "name",
        },
      );
    }

    // Check nested resources
    if (isDomainDef(def) || isSubdomainDef(def)) {
      for (const item of def.body) {
        if (isServiceDef(item)) checkVersionRecursive(item, accept);
        if (isSubdomainDef(item)) checkVersionRecursive(item, accept);
      }
    }

    if (isServiceDef(def)) {
      for (const item of def.body) {
        if (isSendsStmt(item) || isReceivesStmt(item)) {
          checkInlineMessage(item, accept);
        }
      }
    }
  }
}

function checkInlineMessage(
  clause: SendsStmt | ReceivesStmt,
  accept: ValidationAcceptor,
): void {
  if (clause.body.length > 0) {
    const version = getVersion(clause.body as AstNode[]);
    if (!version) {
      const typeName =
        clause.messageType.charAt(0).toUpperCase() +
        clause.messageType.slice(1);
      accept(
        "error",
        `${typeName} '${clause.messageName}' is missing a required 'version' statement`,
        {
          node: clause,
          property: "messageName",
        },
      );
    }
  }
}

function checkVisualizerDuplicates(
  body: AstNode[],
  seen: Map<string, AstNode>,
  accept: ValidationAcceptor,
): void {
  for (const item of body) {
    if (
      isDomainDef(item) ||
      isServiceDef(item) ||
      isChannelDef(item) ||
      isContainerDef(item) ||
      isDataProductDef(item) ||
      isFlowDef(item)
    ) {
      const itemBody =
        "body" in item && Array.isArray(item.body)
          ? (item.body as AstNode[])
          : [];
      const version = getVersion(itemBody);
      const key = version ? `${item.name}@${version}` : item.name;
      if (seen.has(key)) {
        const label = version
          ? `'${item.name}' version ${version}`
          : `'${item.name}'`;
        accept("error", `Duplicate resource definition: ${label}`, {
          node: item,
          property: "name",
        });
      } else {
        seen.set(key, item);
      }
      if (isServiceDef(item)) {
        checkInlineDuplicates(item.body as AstNode[], seen, accept);
      }
      if (isDomainDef(item)) {
        checkNestedDuplicates(item.body as AstNode[], seen, accept);
      }
    }
    if (isEventDef(item) || isCommandDef(item) || isQueryDef(item)) {
      if (item.body && item.body.length > 0) {
        const version = getVersion(item.body as AstNode[]);
        const key = version ? `${item.name}@${version}` : item.name;
        if (seen.has(key)) {
          const label = version
            ? `'${item.name}' version ${version}`
            : `'${item.name}'`;
          accept("error", `Duplicate resource definition: ${label}`, {
            node: item,
            property: "name",
          });
        } else {
          seen.set(key, item);
        }
      }
    }
  }
}
