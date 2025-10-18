(async () => {
  "use strict";

  // ========== GLOBALS ==========
  const REWARDS_DATA_URL = document.getElementById("gezel_youtube")?.dataset.commandsXmlUrl || "";
  console.log("REWARDS_DATA_URL:", REWARDS_DATA_URL);

  let rewardsData = [];
  let folders = {};

  // ========== DOM HELPERS ==========

  function createSafeElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attributes)) {
      if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "class" || k === "className") el.className = v;
      else if (k === "id") el.id = v;
      else el.setAttribute(k, v);
    }
    if (!Array.isArray(children)) children = [children];
    for (const child of children) {
      if (child instanceof Node) el.appendChild(child);
      else if (child !== null && child !== undefined) el.appendChild(document.createTextNode(String(child)));
    }
    return el;
  }

  function createIcon(className, attributes = {}) {
    return createSafeElement("i", Object.assign({ class: className }, attributes));
  }

  // ========== CHAT WRITING LOGIC ==========

  // --- YouTube ---
  async function appendToYouTubeChat(message) {
    let chatInput;
    try {
      chatInput =
        document.querySelector("div#input[contenteditable]") ||
        (document.querySelector("#chatframe")?.contentDocument || document.querySelector("#chatframe")?.contentWindow?.document)?.querySelector(
          "div#input[contenteditable]"
        );
    } catch (e) {
      console.warn("Cross-origin frame access blocked:", e);
      return;
    }

    if (!chatInput) {
      console.warn("YouTube chat input not found.");
      return;
    }

    while (chatInput.firstChild) chatInput.removeChild(chatInput.firstChild);
    const textNode = document.createTextNode(message);
    chatInput.appendChild(textNode);

    const range = document.createRange();
    range.selectNodeContents(chatInput);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    chatInput.focus();
    const event = new InputEvent("input", { bubbles: true, cancelable: true, data: message });
    chatInput.dispatchEvent(event);
    console.log("✅ Message typed into YouTube chat:", message);
  }

  // --- Twitch ---
  function waitForTwitchChatInput(callback) {
    const findInput = () => document.querySelector('[data-a-target="chat-input"][contenteditable="true"]');

    const tryFind = () => {
      const input = findInput();
      if (input) {
        callback(input);
        return true;
      }
      return false;
    };

    if (tryFind()) return;

    const observer = new MutationObserver(() => {
      if (tryFind()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function typeTwitchMessage(input, message) {
    input.focus();

    const clearEvent = new InputEvent("beforeinput", {
      inputType: "deleteContentBackward",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(clearEvent);

    await new Promise((r) => setTimeout(r, 50));

    const inputEvent = new InputEvent("beforeinput", {
      inputType: "insertText",
      data: message,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(inputEvent);

    input.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("📝 Typed Twitch message:", message);

    setTimeout(() => {
      const sendButton = document.querySelector('[data-a-target="chat-send-button"]');
      if (sendButton) {
        sendButton.click();
        console.log("💬 Sent Twitch message:", message);
      } else {
        console.error("❌ Twitch send button not found!");
      }
    }, 200);
  }

  async function appendToTwitchChat(message) {
    waitForTwitchChatInput(async (input) => {
      await typeTwitchMessage(input, message);
    });
  }

  function appendToChat(message) {
    if (window.location.hostname.includes("twitch.tv")) appendToTwitchChat(message);
    else if (window.location.hostname.includes("youtube.com")) appendToYouTubeChat(message);
  }

  // ========== FETCH REWARDS ==========

  async function fetchRewardsData() {
    if (!REWARDS_DATA_URL) {
      console.log("No REWARDS_DATA_URL provided.");
      rewardsData = [];
      folders = {};
      return;
    }
    try {
      const response = await fetch(REWARDS_DATA_URL);
      if (!response.ok) throw new Error("Fetch failed: " + response.status);
      const text = await response.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      rewardsData = [];
      folders = {};
      const rewards = xmlDoc.getElementsByTagName("reward");
      for (let i = 0; i < rewards.length; i++) {
        const reward = rewards[i];
        const getText = (tag) => reward.getElementsByTagName(tag)[0]?.textContent || "";
        const folder = getText("reward_folder") || null;
        if (folder && !folders[folder]) folders[folder] = folder;
        rewardsData.push({
          reward_id: getText("reward_id"),
          reward_name: getText("reward_name"),
          reward_action_chat_message: getText("reward_action_chat_message"),
          reward_folder: folder,
          reward_points: getText("reward_points") || null,
          reward_color: { background: getText("background") || "#333" },
        });
      }

      console.log("🎁 Rewards data loaded:", rewardsData);
    } catch (error) {
      console.error("Error fetching rewards data:", error);
      rewardsData = [];
      folders = {};
    }
  }

  // ========== NO COMMAND MESSAGE ==========

  function displayNoCommandsMessage(platform = "generic") {
    // Prevent duplicates
    if (document.getElementById("YTCRMain")) return;

    const chatRenderer =
      platform === "youtube"
        ? document.querySelector("yt-live-chat-renderer")
        : document.querySelector(".chat-room__content") ||
          document.querySelector(".chat-input");

    if (!chatRenderer) return;

    const spanText1 =
      "If you are reading this and have this streamer's commands, try reloading this page! If you don't, tell them to go to ";
    const anchor = createSafeElement("a", {
      href: "https://github.com/ZLGNF/YTCRemake",
      class: "underline",
      target: "_blank",
    }, ["our GitHub"]);
    const spanWrap = createSafeElement("span", { class: "text-red-600" }, [spanText1, anchor]);
    const innerDiv = createSafeElement("div", { class: "flex justify-between p-2 col-span-full font-bold" }, [spanWrap]);
    const messageDiv = createSafeElement("div", { id: "YTCRMain", class: "text-center break-words p-2" }, [innerDiv]);

    chatRenderer.appendChild(messageDiv);
  }

  // ========== RENDER UI ==========

  function createBaseUI() {
    const pointsButton = createSafeElement("button", {
      id: "PointsButton",
      class: "bg-primary px-2 rounded-lg hover cursor-pointer",
    }, ["Rewards"]);
    const clipIcon = createIcon("fa-solid fa-clapperboard mr-1");
    const clipButton = createSafeElement("button", {
      id: "ClipButton",
      class: "bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none",
    }, [clipIcon, "Clip"]);

    const buttonsDiv = createSafeElement("div", { id: "buttons", class: "flex justify-between p-2 col-span-full font-bold" }, [pointsButton, clipButton]);
    const dropdown = createSafeElement("div", { id: "YTCRDropdown", class: "m-2 col-span-full grid grid-cols-4 gap-3 hidden" }, []);
    const main = createSafeElement("div", { id: "YTCRMain", class: "text-center break-words p-2" }, [buttonsDiv, dropdown]);

    return { main, pointsButton, clipButton, dropdown };
  }

  function renderReward(reward) {
    const container = document.getElementById("YTCRDropdown");
    if (!container) return;

    const children = [createSafeElement("div", { class: "font-bold mb-4" }, [reward.reward_name])];
    if (reward.reward_points) {
      const pointsDiv = createSafeElement("div", {
        class: "font-bold bg-background text-white p-2 text-sm rounded-md shadow-md mt-auto",
      }, [reward.reward_points]);
      children.push(pointsDiv);
    }

    const button = createSafeElement("button", {
      id: `YTCRbutton_${reward.reward_id}`,
      class: "p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer",
      style: `background: ${reward.reward_color.background};`,
    }, children);

    button.addEventListener("click", () => appendToChat("!" + reward.reward_action_chat_message));
    container.appendChild(button);
  }

  function renderRewards(folder = null) {
    const container = document.getElementById("YTCRDropdown");
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    if (folder) {
      const backIcon = createIcon("fa-solid fa-arrow-left", { style: "color: white; font-size: 1.5rem;" });
      const backBtn = createSafeElement("button", {
        class: "p-4 rounded-lg border-2 flex items-center justify-center cursor-pointer",
        style: "background: #444444;",
      }, [backIcon]);
      backBtn.addEventListener("click", () => renderRewards());
      container.appendChild(backBtn);

      rewardsData.filter((r) => r.reward_folder === folder).forEach(renderReward);
    } else {
      Object.entries(folders).forEach(([key, value]) => {
        const folderIcon = createIcon("fa-solid fa-folder text-6xl");
        const folderLabel = createSafeElement("div", {
          class: "font-bold bg-off_white text-background p-2 text-sm rounded-md shadow-md mt-auto",
        }, [value]);
        const folderBtn = createSafeElement("button", {
          id: `YTCRfolder_${key}`,
          class: "p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer",
          style: "background: #333333;",
        }, [folderIcon, folderLabel]);
        folderBtn.addEventListener("click", () => renderRewards(key));
        container.appendChild(folderBtn);
      });
      rewardsData.filter((r) => !r.reward_folder).forEach(renderReward);
    }
  }

  // ========== INITIALIZATION ==========

  function initializeYouTube() {
    findChannelId((channelId) => {
      window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");
      const listener = (event) => {
        if (event.data?.source === "contentScript.js" && event.data.message === "rewardsData") {
          window.removeEventListener("message", listener);
          const { data } = event.data;
          if (data?.rewardsData?.length) {
            rewardsData = data.rewardsData;
            folders = data.folders || {};
            const chatRenderer = document.querySelector("yt-live-chat-renderer");
            if (chatRenderer) {
              const existing = document.getElementById("YTCRMain");
              if (existing) existing.remove();
              const { main, pointsButton, clipButton } = createBaseUI();
              chatRenderer.appendChild(main);
              pointsButton.addEventListener("click", () => {
                const dropdown = document.getElementById("YTCRDropdown");
                dropdown.classList.toggle("hidden");
                if (!dropdown.classList.contains("hidden")) renderRewards();
              });
              clipButton.addEventListener("click", () => appendToChat("!clip"));
            }
          } else displayNoCommandsMessage("youtube");
        }
      };
      window.addEventListener("message", listener);
    });
  }

  function initializeTwitch() {
    findTwitchChannelName(channelName => {
      window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

      const onMessage = (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== "contentScript.js" || event.data.message !== "rewardsData") return;

        window.removeEventListener("message", onMessage);

        const { data } = event.data;
        if (!data || !data.rewardsData?.length) {
          console.log("No rewards data available — showing fallback message.");
          displayNoCommandsMessage("twitch");
          return;
        }

        rewardsData = data.rewardsData || [];
        folders = data.folders || {};

        const chatRenderer = document.querySelector(".chat-input");
        if (!chatRenderer) return;

        const existing = document.getElementById("YTCRMain");
        if (existing) {
          console.log("YTCR: replacing existing UI instead of stacking duplicates.");
          existing.remove();
        }

        const { main, pointsButton, clipButton } = createBaseUI();
        chatRenderer.appendChild(main);

        pointsButton.addEventListener("click", () => {
          const rewardsContainer = document.getElementById("YTCRDropdown");
          if (rewardsContainer.classList.contains("hidden")) {
            renderRewards();
            rewardsContainer.classList.remove("hidden");
          } else {
            rewardsContainer.classList.add("hidden");
          }
        });

        clipButton.addEventListener("click", () => appendToChat('!clip'));
      };

      window.addEventListener("message", onMessage);
    });
  }

  function findTwitchChannelName(callback) {
    const url = window.location.href;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(?:popout\/)?([^\/?]+)/i);
    if (match && match[1]) {
      const channelName = match[1];
      localStorage.setItem("ytcr_channel_id", channelName);
      callback(channelName);
    } else setTimeout(() => findTwitchChannelName(callback), 1000);
  }

  function findChannelId(callback) {
    const data = parent.ytInitialData || parent.ytcfg?.data_;
    let channelId;
    try {
      if (data) {
        channelId =
          data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
          data.CHANNEL_ID;
        if (channelId) {
          localStorage.setItem("ytcr_channel_id", channelId);
          callback(channelId);
          return;
        }
      }
      const cached = localStorage.getItem("ytcr_channel_id");
      if (cached) {
        callback(cached);
        return;
      }
      setTimeout(() => findChannelId(callback), 1000);
    } catch (err) {
      console.error("findChannelId error:", err);
    }
  }

  function initializeExtension() {
    if (window.location.hostname.includes("youtube.com")) initializeYouTube();
    else if (window.location.hostname.includes("twitch.tv")) initializeTwitch();
  }

  const initInterval = setInterval(() => {
    if (!document.getElementById("YTCRMain")) initializeExtension();
  }, 1000);
})();
