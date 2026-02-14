#!/usr/bin/env bash
#
# Assembles the individual specification files into a single SPEC.md
# Usage: ./specification/build-spec.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$SCRIPT_DIR/../SPEC.md"

cat > "$OUTPUT" << 'HEADER'
# EventCatalog DSL — Language Specification

> Version: 1.0.0-draft
> Status: Draft
> Date: 2026-02-08

## Table of Contents

1. [Overview](#overview)
2. [Domain](#domain)
3. [Service](#service)
4. [Event](#event)
5. [Command](#command)
6. [Query](#query)
7. [Channel](#channel)
8. [Container](#container)
9. [Data Product](#data-product)
10. [Flow](#flow)
11. [User](#user)
12. [Team](#team)
13. [Relationships & Pointers](#relationships--pointers)
14. [Versioning](#versioning)
15. [Metadata & Annotations](#metadata--annotations)
16. [Complete Examples](#complete-examples)
17. [Full Grammar (EBNF)](#full-grammar-ebnf)

---

HEADER

# Append each spec file in order, separated by ---
for file in "$SCRIPT_DIR"/[0-9][0-9]-*.md; do
  cat "$file" >> "$OUTPUT"
  printf '\n---\n\n' >> "$OUTPUT"
done

echo "Built $OUTPUT from $(ls "$SCRIPT_DIR"/[0-9][0-9]-*.md | wc -l | tr -d ' ') specification files."
