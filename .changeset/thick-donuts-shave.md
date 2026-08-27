---
'@eventcatalog/core': patch
---

fix(core): dev command crashing on Windows with regex_error(error_escape)

The file watcher interpolated raw Windows backslash paths into its ignore
glob, which @parcel/watcher compiles with std::regex. Depending on the
characters in the project path (e.g. a folder starting with `x` produced an
invalid `\x` escape), this crashed `npm run dev` on startup. Paths are now
normalized to forward slashes before building the glob.
