---
'@eventcatalog/core': patch
---

fix(core): the EventCatalog Assistant no longer scrolls up and down while a long answer streams in. It follows the answer to the bottom, stays where you are when you scroll up to read, and follows again when you scroll back down or send a message. Links still arriving show as their text, so the answer no longer jumps as each one completes. Questions that need many lookups now get an answer: the Assistant can take up to 10 steps, and on the last one it has to answer with what it found instead of stopping without a reply
