---
'@eventcatalog/visualiser': patch
'@eventcatalog/core': patch
---

feat(visualiser): Studio's canvas can make what a connection connects to. Let go of a connection on empty canvas and a placeholder appears there with a list beside it (suggested connections first, searchable, arrow keys and Enter) to choose what it is. The new node is added where you let go, connected, in one undo step, and its card opens to name it. Exports `useConnectNew`, `ConnectChooser`, `ConnectPlaceholderNode` and the helpers in `connect-new.ts`, and `EditableText` can start empty (`startEmpty`); used by EventCatalog's Studio and Studio on the web.
