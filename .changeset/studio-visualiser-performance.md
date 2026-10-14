---
'@eventcatalog/core': patch
'@eventcatalog/visualiser': patch
---

perf(core): Studio and the visualiser do far less work, mostly while nothing is happening. Nothing animates forever anymore: handles' glow pulses only on the node you're on or have selected, and the page's loading bar and the closed chat panel no longer animate while hidden (on every page). Simulated messages pause while the canvas is panned, zoomed or dragged, the envelopes are no longer dashed, and graphs of more than 30 nodes only simulate messages when asked (with the toggle or `?animate=true`), even if they were turned on for another graph. Expanded message groups follow "Simulate messages". Clicking the canvas no longer redraws every node and edge, and no longer animates flow edges. In Studio, a dragged node (or everything in a dragged container) no longer redraws its content on every frame, zooming no longer redraws comment pins and other people's pointers, and nodes are only written to the canvas when they change (a drop in a container no longer rewrites everything in it). L1 and L2 keep what didn't change when they're arranged again, and deleting a node removes where it was on them.
