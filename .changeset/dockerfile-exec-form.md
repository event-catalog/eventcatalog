---
'@eventcatalog/create-eventcatalog': patch
---

Start the server in `Dockerfile.server` with the exec form (`CMD ["npm", "run", "start"]`), so `docker stop` and container shutdowns reach EventCatalog straight away instead of waiting for Docker's timeout.
