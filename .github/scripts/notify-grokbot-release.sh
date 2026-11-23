#!/usr/bin/env bash
# Posts {tag, name, url, body, prerelease} to the Grok Bot release webhook.
# The release notes are passed to jq as data, never interpolated into the JSON.
# Do not enable xtrace: the webhook URL and Authorization value must not be printed.
set -euo pipefail

require_secrets() {
  if [[ -z "${GROKBOT_RELEASE_WEBHOOK_URL:-}" ]]; then
    echo "::error::GROKBOT_RELEASE_WEBHOOK_URL is not set"
    exit 1
  fi
  if [[ -z "${GROKBOT_RELEASE_WEBHOOK_AUTH:-}" ]]; then
    echo "::error::GROKBOT_RELEASE_WEBHOOK_AUTH is not set"
    exit 1
  fi
  case "$GROKBOT_RELEASE_WEBHOOK_URL" in
    https://*) ;;
    http://127.0.0.1:* | http://localhost:*) ;;
    *)
      echo "::error::GROKBOT_RELEASE_WEBHOOK_URL must be an https URL"
      exit 1
      ;;
  esac
}

# $1 release object (GitHub API shape: tag_name, name, html_url, body, draft, prerelease)
# $2 "true" to fail when the release is not announced, "false" to skip it
post_release() {
  local release_json="$1"
  local strict="$2"
  local tag draft prerelease payload reason=""

  tag=$(jq -r '.tag_name // empty' <<<"$release_json")
  draft=$(jq -r '.draft' <<<"$release_json")
  prerelease=$(jq -r '.prerelease' <<<"$release_json")

  if [[ -z "$tag" ]]; then
    echo "::error::Release JSON has no tag_name"
    return 1
  fi
  if [[ "$tag" != @eventcatalog/core@* && "$tag" != @eventcatalog/sdk@* ]]; then
    reason="skip: ${tag} is not @eventcatalog/core or @eventcatalog/sdk"
  elif [[ "$draft" == "true" ]]; then
    reason="skip: ${tag} is a draft"
  elif [[ "$prerelease" == "true" ]]; then
    reason="skip: ${tag} is a prerelease"
  fi

  if [[ -n "$reason" ]]; then
    echo "$reason"
    if [[ "$strict" == "true" ]]; then
      echo "::error::${reason}"
      return 1
    fi
    return 0
  fi

  payload=$(jq -c -n --argjson release "$release_json" '{
    tag: $release.tag_name,
    name: $release.name,
    url: $release.html_url,
    body: $release.body,
    prerelease: $release.prerelease
  }')
  if ! jq -e '
    (.tag | type == "string") and
    (.url | type == "string") and
    (.prerelease | type == "boolean") and
    has("name") and
    has("body")
  ' <<<"$payload" >/dev/null; then
    echo "::error::Refusing to post a release payload that is not the expected shape"
    return 1
  fi

  echo "Posting release notification for ${tag}"
  # -fsS fails the step on an HTTP error and prints that error. The body is stdin,
  # not a shell-interpolated string. Retries cover a webhook blip: re-running the
  # release job will not send again, because changesets will not report the package
  # as newly published a second time.
  printf '%s' "$payload" | curl -fsS --retry 3 --retry-delay 2 -X POST "$GROKBOT_RELEASE_WEBHOOK_URL" \
    -H "Authorization: ${GROKBOT_RELEASE_WEBHOOK_AUTH}" \
    -H "Content-Type: application/json" \
    --data-binary @-
  echo
}

fetch_release() {
  local tag="$1"
  local encoded attempt release_json
  encoded=$(jq -rn --arg t "$tag" '$t|@uri')
  for attempt in 1 2 3 4 5; do
    if release_json=$(gh api "repos/${GITHUB_REPOSITORY}/releases/tags/${encoded}"); then
      printf '%s' "$release_json"
      return 0
    fi
    echo "GitHub release ${tag} is not readable yet (attempt ${attempt} of 5)" >&2
    sleep 3
  done
  echo "::error::Could not read GitHub release ${tag}" >&2
  return 1
}

mode="${1:-}"
case "$mode" in
  --published-packages)
    : "${PUBLISHED_PACKAGES:?PUBLISHED_PACKAGES is required}"
    jq -e 'type == "array"' <<<"$PUBLISHED_PACKAGES" >/dev/null
    matches=$(jq -c '
      [.[]
        | select(.name == "@eventcatalog/core" or .name == "@eventcatalog/sdk")
        | select((.version | type == "string") and (.version | contains("-") | not))]
    ' <<<"$PUBLISHED_PACKAGES")
    if [[ "$matches" == "[]" ]]; then
      echo "No stable @eventcatalog/core or @eventcatalog/sdk package was published"
      exit 0
    fi
    require_secrets
    while IFS= read -r pkg; do
      [[ -z "$pkg" ]] && continue
      name=$(jq -r '.name' <<<"$pkg")
      version=$(jq -r '.version' <<<"$pkg")
      release_json=$(fetch_release "${name}@${version}")
      post_release "$release_json" false
    done < <(jq -c '.[]' <<<"$matches")
    ;;
  --tag)
    tag="${2:?a release tag is required}"
    require_secrets
    release_json=$(fetch_release "$tag")
    post_release "$release_json" true
    ;;
  --from-env)
    require_secrets
    release_json=$(jq -n \
      --arg tag "${RELEASE_TAG:?RELEASE_TAG is required}" \
      --arg name "${RELEASE_NAME:-}" \
      --arg url "${RELEASE_URL:?RELEASE_URL is required}" \
      --arg body "${RELEASE_BODY:-}" \
      --argjson prerelease "${RELEASE_PRERELEASE:-false}" \
      --argjson draft "${RELEASE_DRAFT:-false}" \
      '{
        tag_name: $tag,
        name: (if $name == "" then null else $name end),
        html_url: $url,
        body: $body,
        prerelease: $prerelease,
        draft: $draft
      }')
    post_release "$release_json" true
    ;;
  *)
    echo "::error::Usage: notify-grokbot-release.sh --published-packages|--tag <tag>|--from-env" >&2
    exit 1
    ;;
esac
