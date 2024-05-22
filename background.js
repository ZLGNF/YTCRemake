(() => {
  "use strict";
  chrome.webNavigation.onCompleted.addListener(
    () => {
      (async function () {
        return new Promise((e, t) => {
          chrome.tabs.query({ active: !0, currentWindow: !0 }, (t) => {
            e(t[0]);
          });
        });
      })().then((e) => {
        chrome.webNavigation.getAllFrames({ tabId: e.id }, (t) => {
          t.forEach((t) => {
            const r = [t.frameId];
            t.url.includes("live_chat") &&
              chrome.scripting.executeScript(
                {
                  target: { tabId: e.id, frameIds: r },
                  files: ["contentScript.js"],
                },
                () => {},
              ),
              t.url.includes("youtube.com") &&
                chrome.scripting.executeScript(
                  {
                    target: { tabId: e.id, frameIds: r },
                    files: ["youtube.js"],
                  },
                  () => {},
                );
          });
        });
      });
    },
    { url: [{ urlMatches: "https://www.youtube.com/*" }] },
  ),
    chrome.runtime.onMessage.addListener((e, t, r) => {
      "get_ext_id" === e.type && r({ data: chrome.runtime.id });
    });
})();