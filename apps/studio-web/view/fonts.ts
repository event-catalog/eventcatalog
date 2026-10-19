/**
 * The page's fonts: Inter, as EventCatalog uses, and Excalifont, Excalidraw's hand-drawn font (OFL-1.1) for text and
 * notes on the canvas and the welcome. Their Latin subsets, woff2 only, bundled (views in chats can't load fonts from
 * elsewhere).
 *
 * Made from their bytes with FontFace, not @font-face rules: chats show the view in a sandbox whose
 * Content-Security-Policy has no font-src for it (MCP Apps hosts build it from resourceDomains), so fonts from data:
 * URLs in CSS are blocked there and text fell back to the system font. Fonts made from bytes load no URL. The build
 * inlines each file as a data: URL string; its bytes are decoded here (fetching it would be blocked too).
 */
import inter300 from '@fontsource/inter/files/inter-latin-300-normal.woff2';
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2';
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff2';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2';
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff2';
import excalifont from './styles/fonts/Excalifont-Regular.woff2';

const FONTS: [family: string, file: string, descriptors?: FontFaceDescriptors][] = [
  ['Inter', inter300, { weight: '300' }],
  ['Inter', inter400, { weight: '400' }],
  ['Inter', inter500, { weight: '500' }],
  ['Inter', inter600, { weight: '600' }],
  ['Inter', inter700, { weight: '700' }],
  ['Excalifont', excalifont],
];

const bytesOf = (dataUrl: string) => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (char) => char.charCodeAt(0));

/** Adds the fonts to the page (text drawn before they're ready is redrawn in them, as font-display: swap) */
export function loadFonts() {
  for (const [family, file, descriptors] of FONTS) {
    try {
      const face = new FontFace(family, bytesOf(file), { display: 'swap', ...descriptors });
      document.fonts.add(face);
    } catch {
      // A font that can't be read: its text is drawn in the next font in its stack
    }
  }
}
