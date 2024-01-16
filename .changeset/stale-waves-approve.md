---
'@eventcatalog/plugin-doc-generator-asyncapi': minor
---

* Added AsyncAPI v3 schema support

* Fixed racing condition when writing files to the catalog in the AsyncAPI plugin

  In certain cases the previous frontmatter for the event would not be kept. Instead it would be overwritten with the last event being parsed, causing loss if information.

  The bug appeared during testing with different versions of schemas at the same (v2 + v3), so the fix is integrated into the new functionality.

* Ability to run the plugin as standalone, outside the main project

  This was just a helping technique during debugging, but it's not breaking anything, and the plugin can now be used in a more standalone fashion.
