#!/usr/bin/env node

/**
 * Discord Release Notification Script
 *
 * Sends a nicely formatted release notification to Discord webhook.
 * Parses changeset release notes and creates an embedded message.
 *
 * Environment variables required:
 * - DISCORD_WEBHOOK_URL: The Discord webhook URL
 * - RELEASE_TAG: The release tag (e.g., "@eventcatalog/core@3.2.0")
 * - RELEASE_BODY: The release notes body (markdown)
 * - RELEASE_URL: The GitHub release URL
 */

// Constants
const EVENTCATALOG_AVATAR_URL = 'https://avatars.githubusercontent.com/u/171661582?s=96&v=4';

// Environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const RELEASE_TAG = process.env.RELEASE_TAG || 'Unknown';
const RELEASE_BODY = process.env.RELEASE_BODY || 'No release notes provided.';
const RELEASE_URL = process.env.RELEASE_URL || 'https://github.com/event-catalog/eventcatalog/releases';

if (!DISCORD_WEBHOOK_URL) {
  console.error('Error: DISCORD_WEBHOOK_URL environment variable is required');
  process.exit(1);
}

/**
 * Parse the release body and extract changes by category
 */
function parseReleaseNotes(body) {
  const sections = {
    features: [],
    fixes: [],
    other: [],
  };

  // Split by lines and process
  const lines = body.split('\n');
  let currentSection = 'other';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers (### Minor Changes, ### Patch Changes, etc.)
    if (trimmed.startsWith('#')) {
      const lowerLine = trimmed.toLowerCase();
      if (lowerLine.includes('minor') || lowerLine.includes('feature')) {
        currentSection = 'features';
      } else if (lowerLine.includes('patch') || lowerLine.includes('fix')) {
        currentSection = 'fixes';
      }
      continue;
    }

    // Skip empty lines
    if (!trimmed) continue;

    // Process bullet points
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      let content = trimmed.slice(1).trim();

      // Extract PR/issue numbers before cleaning
      const prMatches = content.match(/#(\d+)/g) || [];
      const prNumbers = [...new Set(prMatches.map((m) => m.slice(1)))]; // Remove # and dedupe

      // Clean up changeset formatting thoroughly
      // Remove markdown links like [abc123](url) or [#123](url)
      content = content.replace(/\[[^\]]*\]\([^)]*\)/g, '');
      // Remove PR references like (#123)
      content = content.replace(/\(#\d+\)/g, '');
      // Remove standalone commit hashes
      content = content.replace(/\b[a-f0-9]{7,40}\b/g, '');
      // Remove package prefixes like @eventcatalog/core: or just leading colons
      content = content.replace(/@[\w-]+\/[\w-]+:\s*/g, '');
      content = content.replace(/^:\s*/, '');
      // Clean up extra whitespace
      content = content.replace(/\s+/g, ' ').trim();

      // Append PR links at the end if found (use angle brackets for Discord auto-linking)
      if (prNumbers.length > 0) {
        const prLinks = prNumbers.map((n) => `<https://github.com/event-catalog/eventcatalog/pull/${n}>`).join(' ');
        content = `${content}\n${prLinks}`;
      }

      // Skip empty or too short after cleanup
      if (!content || content.length < 3) continue;

      // Categorize based on current section (determined by headers)
      // Also check content for keywords as fallback
      const lowerContent = content.toLowerCase();
      if (currentSection === 'fixes' || lowerContent.startsWith('fix') || lowerContent.includes('bug fix')) {
        sections.fixes.push(content);
      } else if (currentSection === 'features' || lowerContent.startsWith('add') || lowerContent.startsWith('feat')) {
        sections.features.push(content);
      } else {
        sections.other.push(content);
      }
    }
  }

  return sections;
}

/**
 * Format sections into Discord-friendly text
 * Uses Discord's underline formatting (__text__) for clean headers
 */
function formatSections(sections) {
  const parts = [];

  if (sections.features.length > 0) {
    parts.push(`__New Features__\n${sections.features.map((f) => `• ${f}`).join('\n\n')}`);
  }

  if (sections.fixes.length > 0) {
    parts.push(`__Bug Fixes__\n${sections.fixes.map((f) => `• ${f}`).join('\n\n')}`);
  }

  if (sections.other.length > 0) {
    parts.push(`__Other Changes__\n${sections.other.map((f) => `• ${f}`).join('\n\n')}`);
  }

  return parts.join('\n\n');
}

/**
 * Extract version from release tag
 */
function extractVersion(tag) {
  // Handle tags like "@eventcatalog/core@3.2.0" or "v3.2.0"
  return tag.match(/(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/)?.[1] ?? tag;
}

/**
 * Build the Discord payload as plain text (no embed box)
 */
function buildDiscordPayload(releaseTag, releaseBody, releaseUrl) {
  const version = extractVersion(releaseTag);
  const sections = parseReleaseNotes(releaseBody);
  const formattedChanges = formatSections(sections);

  let content = `**EventCatalog v${version}**\n\n`;
  content += formattedChanges || 'Check the release notes for details.';
  content += `\n\n<${releaseUrl}>`;

  // Discord message limit is 2000 characters
  if (content.length > 1900) {
    const truncatedChanges = formattedChanges.slice(0, 1500);
    content = `**EventCatalog v${version}**\n\n${truncatedChanges}\n\n*... and more*\n\n<${releaseUrl}>`;
  }

  return {
    username: 'EventCatalog Release Bot',
    avatar_url: EVENTCATALOG_AVATAR_URL,
    content: content,
  };
}

/**
 * Send the notification to Discord
 */
async function sendToDiscord(payload) {
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API error: ${response.status} - ${errorText}`);
  }

  return response;
}

/**
 * Main function
 */
async function main() {
  console.log('📣 Preparing Discord release notification...');
  console.log(`   Release: ${RELEASE_TAG}`);

  try {
    const payload = buildDiscordPayload(RELEASE_TAG, RELEASE_BODY, RELEASE_URL);

    console.log('📤 Sending to Discord...');
    await sendToDiscord(payload);

    console.log('✅ Discord notification sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error.message);
    process.exit(1);
  }
}

main();
