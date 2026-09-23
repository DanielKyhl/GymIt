import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// The HTML shell for the web build only; native never sees this file. It adds
// what a browser needs to install GymIt as an app: the manifest, the icons and
// the service worker.
//
// Note the viewport has no `viewport-fit=cover`. No screen reads safe-area
// insets, so letting iOS inset the viewport itself is what keeps the header
// clear of the status bar and the tab bar clear of the home indicator.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        <title>GymIt</title>
        <meta name="description" content="Log every set. Watch yourself get stronger." />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#131313" />
        <meta name="color-scheme" content="dark" />

        {/* iOS reads these rather than the manifest for home-screen apps. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="GymIt" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
        <link rel="icon" href="/icons/icon-192.png" />

        {/* Without this the body scrolls behind the app's own scroll views. */}
        <ScrollViewStyleReset />

        {/* The background is set here too so there's no white flash before the
            app's own styles land. */}
        <style dangerouslySetInnerHTML={{ __html: `html,body,#root{background-color:#131313;color-scheme:dark}` }} />

        {/* The static renderer puts an empty <title> above this one and the
            first title is the one a browser uses, so set it from script too.
            Then register the worker, after load so it never delays the first
            paint. A failed registration only costs offline support. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.title='GymIt';if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
