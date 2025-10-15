(async () => {
    "use strict";

    // Read commands URL from injected script element (may be empty string)
    const REWARDS_DATA_URL = document.getElementById('gezel_youtube')?.dataset.commandsXmlUrl || '';
    console.log("REWARDS_DATA_URL:", REWARDS_DATA_URL);

    let rewardsData = [];
    let folders = {};

    // Safe DOM builder (no innerHTML, no DOMParser)
    function createSafeElement(tag, attributes = {}, children = []) {
        const el = document.createElement(tag);

        for (const [k, v] of Object.entries(attributes)) {
            if (k === "style") {
                if (typeof v === "object") {
                    Object.assign(el.style, v);
                } else if (typeof v === "string") {
                    // keep string style if provided
                    el.setAttribute("style", v);
                }
            } else if (k === "class" || k === "className") {
                el.className = v;
            } else if (k === "id") {
                el.id = v;
            } else {
                el.setAttribute(k, v);
            }
        }

        const appendChildSafe = child => {
            if (child === null || child === undefined) return;
            if (typeof child === "string" || typeof child === "number") {
                el.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof Node) {
                el.appendChild(child);
            } else if (Array.isArray(child)) {
                child.forEach(appendChildSafe);
            } else {
                // ignore unknown types
            }
        };

        if (!Array.isArray(children)) children = [children];
        children.forEach(appendChildSafe);

        return el;
    }

    // helper to create an <i> icon with classes
    function createIcon(className, attributes = {}) {
        return createSafeElement('i', Object.assign({ class: className }, attributes));
    }

    function showNotification(message) {
        const notification = createSafeElement('div', {
            style: {
                position: 'fixed',
                padding: '10px 20px',
                backgroundColor: '#333',
                color: '#fff',
                borderRadius: '5px',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                zIndex: '1000'
            }
        }, [message]);

        document.body.appendChild(notification);

        const clipButton = document.getElementById('ClipButton');
        const pointsButton = document.getElementById('PointsButton');
        if (clipButton && pointsButton) {
            try {
                const clipRect = clipButton.getBoundingClientRect();
                const pointsRect = pointsButton.getBoundingClientRect();
                const centerX = (clipRect.right + pointsRect.left) / 2;
                notification.style.left = `${centerX - (notification.offsetWidth / 2)}px`;
                notification.style.bottom = '50px';
            } catch (e) {
                notification.style.bottom = '50px';
                notification.style.right = '20px';
            }
        } else {
            notification.style.bottom = '50px';
            notification.style.right = '20px';
        }

        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 3000);
    }

    function copyToClipboard(text) {
        const tempInput = document.createElement('textarea');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            showNotification('Copied to clipboard: ' + text);
        } catch (e) {
            console.error("copyToClipboard failed:", e);
        }
        document.body.removeChild(tempInput);
    }

    function appendToChat(message) {
    if (!window.location.hostname.includes('youtube.com')) {
        copyToClipboard(message);
        return;
    }

    let chatInput;
    try {
        chatInput = document.querySelector('div#input[contenteditable]') ||
            (document.querySelector("#chatframe")?.contentDocument || document.querySelector("#chatframe")?.contentWindow?.document)
            ?.querySelector('div#input[contenteditable]');
    } catch (e) {
        console.warn("Cross-origin frame access blocked", e);
        copyToClipboard(message);
        return;
    }

    if (!chatInput) {
        console.log('YouTube chat input not found. Copied to clipboard.');
        copyToClipboard(message);
        return;
    }

    // Clear safely
    while (chatInput.firstChild) chatInput.removeChild(chatInput.firstChild);

    // Append text node
    const textNode = document.createTextNode(message);
    chatInput.appendChild(textNode);

    // Set cursor at end
    const range = document.createRange();
    range.selectNodeContents(chatInput);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Dispatch input event so YouTube registers it
    chatInput.focus();
    const event = new InputEvent('input', { bubbles: true, cancelable: true, data: message });
    chatInput.dispatchEvent(event);
    console.log('Message appended to YouTube chat safely:', message);
}


    async function fetchRewardsData() {
        if (!REWARDS_DATA_URL) {
            console.log("No REWARDS_DATA_URL provided.");
            rewardsData = [];
            folders = {};
            return;
        }
        try {
            console.log("Fetching rewards data from:", REWARDS_DATA_URL);
            const response = await fetch(REWARDS_DATA_URL);
            if (!response.ok) throw new Error("Fetch failed: " + response.status);
            const text = await response.text();
            // parse XML via DOMParser is OK for XML in extension context; try/catch in case page blocks
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            rewardsData = [];
            folders = {};

            const rewards = xmlDoc.getElementsByTagName("reward");
            for (let i = 0; i < rewards.length; i++) {
                const reward = rewards[i];
                const getText = (tag) => {
                    const el = reward.getElementsByTagName(tag)[0];
                    return el ? el.textContent : '';
                };
                const folder = getText("reward_folder") || null;
                if (folder && !folders[folder]) folders[folder] = folder;
                rewardsData.push({
                    reward_id: getText("reward_id"),
                    reward_name: getText("reward_name"),
                    reward_action_chat_message: getText("reward_action_chat_message"),
                    reward_folder: folder,
                    reward_points: getText("reward_points") || null,
                    reward_color: {
                        background: getText("background") || '#333'
                    }
                });
            }

            console.log("Rewards data fetched and parsed:", rewardsData);
            console.log("Folders:", folders);
        } catch (error) {
            console.error("Error fetching rewards data:", error);
            rewardsData = [];
            folders = {};
        }
    }

    function renderReward(reward) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        if (!rewardsContainer) return;

        const children = [];

        // reward name
        children.push(createSafeElement('div', { class: 'font-bold mb-4' }, [reward.reward_name]));

        // points (optional)
        if (reward.reward_points) {
            const pointsDiv = createSafeElement('div', {
                class: 'font-bold bg-background text-white p-2 text-sm rounded-md shadow-md mt-auto'
            }, [reward.reward_points]);
            children.push(pointsDiv);
        }

        const rewardButton = createSafeElement('button', {
            id: `YTCRbutton_${reward.reward_id}`,
            class: 'p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer',
            style: `background: ${reward.reward_color.background};`
        }, children);

        rewardButton.addEventListener("click", () => appendToChat('!' + reward.reward_action_chat_message));
        rewardsContainer.appendChild(rewardButton);
    }

    function renderRewards(folder = null) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        if (!rewardsContainer) return;
        // clear children
        while (rewardsContainer.firstChild) rewardsContainer.removeChild(rewardsContainer.firstChild);

        if (folder) {
            const icon = createIcon('fa-solid fa-arrow-left', { style: 'color: white; font-size: 1.5rem;' });
            const backButton = createSafeElement('button', {
                class: 'p-4 rounded-lg border-2 flex items-center justify-center cursor-pointer',
                style: 'background: #444444;'
            }, [icon]);
            backButton.addEventListener("click", () => renderRewards());
            rewardsContainer.appendChild(backButton);

            rewardsData.filter(reward => reward.reward_folder === folder)
                .forEach(renderReward);
        } else {
            // render folders first
            Object.entries(folders).forEach(([key, value]) => {
                const folderIcon = createIcon('fa-solid fa-folder text-6xl');
                const folderLabel = createSafeElement('div', {
                    class: 'font-bold bg-off_white text-background p-2 text-sm rounded-md shadow-md mt-auto'
                }, [value]);

                const folderButton = createSafeElement('button', {
                    id: `YTCRfolder_${key}`,
                    class: 'p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer',
                    style: 'background: #333333;'
                }, [folderIcon, folderLabel]);

                folderButton.addEventListener("click", () => renderRewards(key));
                rewardsContainer.appendChild(folderButton);
            });

            // render uncategorized rewards
            rewardsData.filter(reward => !reward.reward_folder)
                .forEach(renderReward);
        }
    }

    function displayNoCommandsMessageTwitch() {
    const isTwitch = window.location.hostname.includes("twitch.tv");

    function buildMessageElement() {
        const wrapper = document.createElement("div");
        wrapper.id = "YTCRMain";
        wrapper.className = "ytcr-warning text-center break-words p-2";
        wrapper.style.cssText = `
            background-color: #222;
            color: #fff;
            border-radius: 6px;
            padding: 10px;
            margin: 6px 0;
            font-size: 0.9rem;
        `;

        const span = document.createElement("span");
        span.textContent = "If you are reading this and have this streamer's commands, try reloading this page! If you don't, tell them to go to ";

        const link = document.createElement("a");
        link.href = "https://github.com/ZLGNF/YTCRemake";
        link.className = "underline";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "our GitHub";

        span.appendChild(link);
        wrapper.appendChild(span);
        return wrapper;
    }

    function insertMessage(target) {
        if (!target || document.getElementById("YTCRMain")) return false;
        try {
            // insert before the typing box (looks cleaner)
            if (target.parentElement) {
                target.parentElement.insertBefore(buildMessageElement(), target);
            } else {
                target.appendChild(buildMessageElement());
            }
            console.debug("YTCR: inserted fallback message near", target);
            return true;
        } catch (e) {
            console.error("YTCR: failed to append fallback message", e);
            return false;
        }
    }

    let target = null;

     if (isTwitch) {
        // Twitch chat typing area (most consistent place)
        target = document.querySelector(".chat-input__textarea");
    }

    // If no immediate target, retry a few times (lazy loading)
    let retries = 0;
    const maxRetries = 10;
    const interval = setInterval(() => {
        if (document.getElementById("YTCRMain")) {
            clearInterval(interval);
            return;
        }
        if (!target) {
            if (isTwitch) {
                target = document.querySelector(".chat-input__textarea") ||
                         document.querySelector(".chat-input__container");
            }
        }
        if (target && insertMessage(target)) {
            clearInterval(interval);
        } else if (++retries >= maxRetries) {
            clearInterval(interval);
            console.warn("YTCR: failed to place fallback message after retries.");
        }
    }, 1000);
}

function displayNoCommandsMessageYoutube() {
        const chatRenderer = document.querySelector("yt-live-chat-renderer");
        if (!chatRenderer) return;

        const spanText1 = "If you are reading this and have this streamer's commands, try reloading this page! If you don't, tell them to go to ";
        const anchor = createSafeElement('a', { href: 'https://github.com/ZLGNF/YTCRemake', class: 'underline', target: '_blank' }, ['our GitHub']);
        const spanWrap = createSafeElement('span', { class: 'text-red-600' }, [spanText1, anchor]);

        const innerDiv = createSafeElement('div', { class: 'flex justify-between p-2col-span-full font-bold' }, [spanWrap]);
        const messageDiv = createSafeElement('div', { id: 'YTCRMain', class: 'text-center break-words p-2' }, [innerDiv]);
        chatRenderer.appendChild(messageDiv);
    }

    function findTwitchChannelName(callback) {
        const url = window.location.href;
        const twitchUrlRegex = /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(?:popout\/)?([^\/?]+)/i;
        const match = url.match(twitchUrlRegex);

        if (match && match[1]) {
            const channelName = match[1];
            localStorage.setItem("ytcr_channel_id", channelName);
            console.log("Twitch Channel Name:", channelName);
            callback(channelName);
        } else {
            console.log("Twitch Channel Name not found in URL. Waiting...");
            setTimeout(() => findTwitchChannelName(callback), 1000);
        }
    }

    function findChannelId(callback) {
        const data = parent.ytInitialData || parent.ytcfg?.data_;
        let channelId;

        try {
            if (data) {
                if (data.contents?.twoColumnWatchNextResults?.results?.results?.contents[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.title?.runs[0]?.navigationEndpoint?.browseEndpoint?.browseId) {
                    channelId = data.contents.twoColumnWatchNextResults.results.results.contents[1]
                        .videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0]
                        .navigationEndpoint.browseEndpoint.browseId;
                } else if (data.CHANNEL_ID) {
                    channelId = data.CHANNEL_ID;
                }

                if (channelId) {
                    console.log("YouTube Channel ID:", channelId);
                    localStorage.setItem("ytcr_channel_id", channelId); // Store channelId in localStorage
                    callback(channelId);
                    return;
                }
            }

            console.log("ytInitialData or ytcfg data not found or Channel ID not found. Trying to get channelId from localStorage...");
            channelId = localStorage.getItem("ytcr_channel_id");
            if (channelId) {
                console.log("Channel ID found in localStorage:", channelId);
                callback(channelId);
                return;
            }

            console.log("Channel ID not found in localStorage. Waiting...");
            setTimeout(() => findChannelId(callback), 1000);
        } catch (error) {
            console.error("Error occurred while trying to find Channel ID:", error);
        }
    }

    function createBaseUI() {
        // shared UI insertion for both YouTube and Twitch
        const pointsButton = createSafeElement('button', { id: 'PointsButton', class: 'bg-primary px-2 rounded-lg hover cursor-pointer' }, ['Rewards']);
        const clipIcon = createIcon('fa-solid fa-clapperboard mr-1');
        const clipButton = createSafeElement('button', {
            id: 'ClipButton',
            class: 'bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none'
        }, [clipIcon, 'Clip']);

        const buttonsDiv = createSafeElement('div', { id: 'buttons', class: 'flex justify-between p-2 col-span-full font-bold' }, [pointsButton, clipButton]);
        const dropdown = createSafeElement('div', { id: 'YTCRDropdown', class: 'm-2 col-span-full grid grid-cols-4 gap-3 hidden' }, []);
        const main = createSafeElement('div', { id: 'YTCRMain', class: 'text-center break-words p-2' }, [buttonsDiv, dropdown]);

        return { main, pointsButton, clipButton, dropdown };
    }

    function initializeYouTube() {
        displayNoCommandsMessageYoutube();
        findChannelId(channelId => {
            // ask content script (page-level contentScript) to fetch rewards and post back via window.postMessage
            window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

            // one-time listener for rewards data
            const onMessage = (event) => {
                if (event.source !== window) return;
                if (!event.data || event.data.source !== "contentScript.js" || event.data.message !== "rewardsData") return;

                window.removeEventListener("message", onMessage);

                const { data } = event.data;
                if (data) {
                    rewardsData = data.rewardsData || [];
                    folders = data.folders || {};

                    const chatRenderer = document.querySelector("yt-live-chat-renderer");
                    if (chatRenderer) {
                        const existing = document.getElementById("YTCRMain");
                        if (existing) existing.remove();

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
                    }
                } else {
                    console.log("No rewards data available.");
                }
            };

            window.addEventListener("message", onMessage);
        });
    }

    function initializeTwitch() {
        displayNoCommandsMessageTwitch();
        findTwitchChannelName(channelName => {
            window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

            const onMessage = (event) => {
                if (event.source !== window) return;
                if (!event.data || event.data.source !== "contentScript.js" || event.data.message !== "rewardsData") return;

                window.removeEventListener("message", onMessage);

                const { data } = event.data;
                if (data) {
                    rewardsData = data.rewardsData || [];
                    folders = data.folders || {};

                    const chatRenderer = document.querySelector(".chat-input");
                    if (chatRenderer) {
                        const existing = document.getElementById("YTCRMain");
                        if (existing) existing.remove();

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
                    }
                } else {
                    console.log("No rewards data available.");
                }
            };

            window.addEventListener("message", onMessage);
        });
    }

    function initializeExtension() {
        const isYouTube = window.location.hostname.includes('youtube.com');
        const isTwitch = window.location.hostname.includes('twitch.tv');

        if (isYouTube) initializeYouTube();
        else if (isTwitch) initializeTwitch();
    }

    function tryInitialize() {
        if (!document.getElementById("YTCRMain")) {
            initializeExtension();
        } else {
            console.log("YTCR Extension already initialized.");
        }
    }

    const initializeInterval = setInterval(tryInitialize, 1000);

    const chatObserverTarget = document.querySelector(".chat-input") || document.querySelector("yt-live-chat-renderer");
    if (chatObserverTarget) {
        const chatObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.target.id === 'YTCRMain' && mutation.type === 'childList') {
                    clearInterval(initializeInterval);
                    initializeExtension();
                }
            });
        });
        chatObserver.observe(chatObserverTarget, { childList: true });
    } else {
        console.warn("Chat observer target not found; skipping MutationObserver setup.");
    }

})();
