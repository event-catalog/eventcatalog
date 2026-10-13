---
'@eventcatalog/core': patch
---

Stop the server along with the CLI. When `eventcatalog start` (or `dev`, `build` or `preview`) receives SIGTERM, SIGINT or SIGHUP, it now passes the signal to the process it started and exits once that has stopped, rather than leaving the server running and holding its port.
