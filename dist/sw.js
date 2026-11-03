/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "favicon.png",
    "revision": "818022fe7ac5d4afd4b3e30fcb0a630c"
  }, {
    "url": "robots.txt",
    "revision": "d2ab914a1820906bd49451cb0a108119"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "ddb7e6c143dcbbc44928916ea2e045e4"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "562a5fd578aedb3209a647bbc20523f8"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "43444f727ab3575e22293a16a48f7d58"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "4d90b91a1f1a5369a3408ec1eeacd9ca"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "68ede10330e26a5829b7b82e8549aaa3"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "47c1621025ebd0b1764d429a91e9bd44"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "c31a8b31e979c1bccbafa543269e754b"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "c5e956b808b51607e3a56b231ce98d6c"
  }, {
    "url": "icons/icon-maskable-512x512.png",
    "revision": "47c1621025ebd0b1764d429a91e9bd44"
  }, {
    "url": "manifest.webmanifest",
    "revision": "712ab307f02052f05c53c2dd7a4ac7da"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/cdnjs\.cloudflare\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "fontawesome-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
