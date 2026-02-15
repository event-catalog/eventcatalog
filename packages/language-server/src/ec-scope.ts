import type { AstNodeDescription, LangiumDocument } from "langium";
import { DefaultScopeComputation } from "langium";
import type { Program } from "./generated/ast.js";

/**
 * Custom ScopeComputation that exports all top-level ResourceDefinitions.
 * This enables cross-file reference resolution when imports are used.
 */
export class EcScopeComputation extends DefaultScopeComputation {
  override async computeExports(
    document: LangiumDocument,
  ): Promise<AstNodeDescription[]> {
    const program = document.parseResult.value as Program;
    const descriptions: AstNodeDescription[] = [];
    for (const def of program.definitions) {
      if ("name" in def && typeof def.name === "string") {
        descriptions.push(
          this.descriptions.createDescription(def, def.name, document),
        );
      }
    }
    return descriptions;
  }
}
