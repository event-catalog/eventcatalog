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
  isActorDef,
  isDomainDef,
  isExternalSystemDef,
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

    for (const def of program.definitions) {
      if ("name" in def && typeof def.name === "string") {
        checkAndRegisterDuplicate(
          seen,
          def.name,
          "body" in def && Array.isArray(def.body)
            ? getVersion(def.body)
            : undefined,
          def,
          "name",
          accept,
        );

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

/** Check if a name+version pair is already in `seen`; if so, emit an error. */
function checkAndRegisterDuplicate(
  seen: Map<string, AstNode>,
  name: string,
  version: string | undefined,
  node: AstNode,
  property: string,
  accept: ValidationAcceptor,
): void {
  const key = version ? `${name}@${version}` : name;
  if (seen.has(key)) {
    const label = version ? `'${name}' version ${version}` : `'${name}'`;
    accept("error", `Duplicate resource definition: ${label}`, {
      node,
      property,
    });
  } else {
    seen.set(key, node);
  }
}

function checkNestedDuplicates(
  body: AstNode[],
  seen: Map<string, AstNode>,
  accept: ValidationAcceptor,
): void {
  for (const item of body) {
    if (isServiceDef(item)) {
      checkAndRegisterDuplicate(
        seen,
        item.name,
        getVersion(item.body as AstNode[]),
        item,
        "name",
        accept,
      );
      checkInlineDuplicates(item.body as AstNode[], seen, accept);
    }
    if (isFlowDef(item)) {
      checkAndRegisterDuplicate(
        seen,
        item.name,
        getVersion(item.body as AstNode[]),
        item,
        "name",
        accept,
      );
    }
    if (isSubdomainDef(item)) {
      checkAndRegisterDuplicate(
        seen,
        item.name,
        getVersion(item.body as AstNode[]),
        item,
        "name",
        accept,
      );
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
      checkAndRegisterDuplicate(
        seen,
        item.messageName,
        getVersion(item.body as AstNode[]),
        item,
        "messageName",
        accept,
      );
    }
  }
}

function checkVersionRecursive(
  def: ResourceDefinition | SubdomainDef,
  accept: ValidationAcceptor,
): void {
  // Users, teams, actors, external-systems, and visualizers don't need versions
  if (
    isUserDef(def) ||
    isTeamDef(def) ||
    isActorDef(def) ||
    isExternalSystemDef(def) ||
    isVisualizerDef(def)
  ) {
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
        if (isFlowDef(item)) checkVersionRecursive(item, accept);
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
      checkAndRegisterDuplicate(
        seen,
        item.name,
        getVersion(itemBody),
        item,
        "name",
        accept,
      );
      if (isServiceDef(item)) {
        checkInlineDuplicates(item.body as AstNode[], seen, accept);
      }
      if (isDomainDef(item)) {
        checkNestedDuplicates(item.body as AstNode[], seen, accept);
      }
    }
    if (isEventDef(item) || isCommandDef(item) || isQueryDef(item)) {
      if (item.body && item.body.length > 0) {
        checkAndRegisterDuplicate(
          seen,
          item.name,
          getVersion(item.body as AstNode[]),
          item,
          "name",
          accept,
        );
      }
    }
  }
}
