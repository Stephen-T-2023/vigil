/* ============================================
   _document.js
   Vigil — Ashborne
   Custom document — sets base HTML structure.
   Inline script reads saved theme from
   localStorage before page renders to prevent
   flash of wrong theme on load.
   ============================================ */

import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        {/* Inline script runs before React hydrates
            to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('vigil-theme');
                if (theme === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch(e) {}
            })();
          `
        }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}