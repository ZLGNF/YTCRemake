(() => {
  "use strict";

  chrome.webNavigation.onCompleted.addListener(async () => {
    try {
      const tabs = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) {
            resolve(tabs[0]);
          } else {
            reject("No active tab found");
          }
        });
      });

      const frames = await new Promise((resolve, reject) => {
        chrome.webNavigation.getAllFrames({ tabId: tabs.id }, (frames) => {
          if (frames) {
            resolve(frames);
          } else {
            reject("No frames found");
          }
        });
      });

      frames.forEach((frame) => {
        const frameId = frame.frameId;
        const url = frame.url;

        if (url.includes("live_chat") || url.includes("studio.youtube.com") || url.includes("twitch.tv")) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs.id, frameIds: [frameId] },
              files: ["contentScript.js"],
            },
            () => {
              console.log(`Injected contentScript.js into frameId: ${frameId}`);
            }
          );
        }
      });
    } catch (error) {
      console.error(error);
    }
  }, 
  { 
    url: [
      { urlMatches: "https://www.youtube.com/*" },
      { urlMatches: "https://studio.youtube.com/*" },
      { urlMatches: "https://www.twitch.tv/*" }
    ] 
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "get_ext_id") {
      sendResponse({ data: chrome.runtime.id });
    }
  });
})();