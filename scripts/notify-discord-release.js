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
const EVENTCATALOG_BRAND_COLOR = 0x7c3aed; // Purple
const EVENTCATALOG_AVATAR_URL = 'https://avatars.githubusercontent.com/u/106890076?s=200&v=4';
const MAX_DESCRIPTION_LENGTH = 3800; // Discord limit is 4096, leave buffer for truncation message

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

    // Skip empty lines and headers we don't need
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('##')) {
      // Check for section headers
      const lowerLine = trimmed.toLowerCase();
      if (lowerLine.includes('minor') || lowerLine.includes('feature')) {
        currentSection = 'features';
      } else if (lowerLine.includes('patch') || lowerLine.includes('fix')) {
        currentSection = 'fixes';
      }
      continue;
    }

    // Process bullet points
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      let content = trimmed.slice(1).trim();

      // Clean up changeset formatting
      // Remove commit hashes and PR links for cleaner output
      content = content.replace(/\s*\[[a-f0-9]+\]\(.*?\)/g, '');
      content = content.replace(/\s*\(#\d+\)/g, '');

      // Skip empty after cleanup
      if (!content) continue;

      // Categorize based on content if not already categorized
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('fix') || lowerContent.includes('bug')) {
        sections.fixes.push(content);
      } else if (
        lowerContent.includes('add') ||
        lowerContent.includes('feat') ||
        lowerContent.includes('new') ||
        lowerContent.includes('support')
      ) {
        sections.features.push(content);
      } else {
        sections[currentSection].push(content);
      }
    }
  }

  return sections;
}

/**
 * Format sections into Discord-friendly text
 */
function formatSections(sections) {
  const parts = [];

  if (sections.features.length > 0) {
    parts.push(`**✨ New Features & Improvements**\n${sections.features.map((f) => `• ${f}`).join('\n')}`);
  }

  if (sections.fixes.length > 0) {
    parts.push(`**🐛 Bug Fixes**\n${sections.fixes.map((f) => `• ${f}`).join('\n')}`);
  }

  if (sections.other.length > 0 && !sections.features.length && !sections.fixes.length) {
    parts.push(`**📝 Changes**\n${sections.other.map((f) => `• ${f}`).join('\n')}`);
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
 * Build the Discord embed payload
 */
function buildDiscordPayload(releaseTag, releaseBody, releaseUrl) {
  const version = extractVersion(releaseTag);
  const sections = parseReleaseNotes(releaseBody);
  const formattedChanges = formatSections(sections);

  let description = formattedChanges || 'Check the release notes for details.';
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = description.slice(0, MAX_DESCRIPTION_LENGTH) + '\n\n*... and more. See full release notes.*';
  }

  const embed = {
    title: `🚀 EventCatalog ${version} Released!`,
    description: description,
    url: releaseUrl,
    color: EVENTCATALOG_BRAND_COLOR,
    thumbnail: {
      url: EVENTCATALOG_AVATAR_URL,
    },
    fields: [
      {
        name: '📦 Install / Update',
        value: '```bash\nnpm install @eventcatalog/core@latest\n```',
        inline: false,
      },
    ],
    footer: {
      text: 'EventCatalog • Documentation for Event-Driven Architectures',
      icon_url: EVENTCATALOG_AVATAR_URL,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    username: 'EventCatalog Releases',
    avatar_url: EVENTCATALOG_AVATAR_URL,
    content: '**A new version of EventCatalog has been released!** 🎉',
    embeds: [embed],
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
