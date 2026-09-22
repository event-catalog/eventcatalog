// Core's browser components live in node_modules in an installed catalog. Vite
// skips discovering dependencies imported from there, so explicitly pre-bundle
// the graph and chat entrypoints, including their nested CommonJS dependencies.
export const clientDependencies = [
  '@eventcatalog/visualiser',
  '@xyflow/react',
  '@ai-sdk/react',
  'ai',
  'lucide-react',
  '@heroicons/react/24/outline',
  '@heroicons/react/24/solid',
  '@heroicons/react/20/solid',
  '@headlessui/react',
  '@nanostores/react',
  'nanostores',
  'react',
  'react-dom',
  'semver',
  'diff',
  'diff2html',
  // ArchitectureGraph embeds also need these ready before the first request.
  // Discovering them mid-session can invalidate already-loaded chunks.
  'd3-force',
  'd3-selection',
  'd3-zoom',
  'd3-drag',
];
