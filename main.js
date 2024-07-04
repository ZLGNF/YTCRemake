(async () => {
    "use strict";

    let rewardsData = [];
    let folders = {};

    function createElement(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

    function showNotification(message) {
        const notification = createElement(`
            <div style="position: fixed; padding: 10px 20px; background-color: #333; color: #fff; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 1000;">
                ${message}
            </div>
        `);
        document.body.appendChild(notification);

        const clipButton = document.getElementById('ClipButton');
        const pointsButton = document.getElementById('PointsButton');
        if (clipButton && pointsButton) {
            const clipRect = clipButton.getBoundingClientRect();
            const pointsRect = pointsButton.getBoundingClientRect();
            const centerX = (clipRect.right + pointsRect.left) / 2;
            notification.style.left = `${centerX - (notification.offsetWidth / 2)}px`;
            notification.style.bottom = '50px';
        } else {
            notification.style.bottom = '50px';
            notification.style.right = '20px';
        }

        setTimeout(() => document.body.removeChild(notification), 3000);
    }

    function copyToClipboard(text) {
        const tempInput = createElement('<textarea style="position: fixed; opacity: 0;"></textarea>');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showNotification('Copied to clipboard: ' + text);
    }

    function appendToChat(message) {
        if (window.location.hostname.includes('youtube.com')) {
            const chatInput = document.querySelector('div#input[contenteditable]') ||
                (document.querySelector("#chatframe")?.contentDocument || document.querySelector("#chatframe")?.contentWindow.document).querySelector('div#input[contenteditable]');
            if (chatInput) {
                chatInput.innerHTML = '';
                chatInput.focus();
                document.execCommand('insertText', false, message);
                console.log('Message appended to YouTube chat:', message);
            } else {
                console.log('YouTube chat input field not found.');
            }
        } else if (window.location.hostname.includes('twitch.tv')) {
            copyToClipboard(message);
        }
    }

    function renderRewards(folder = null) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        rewardsContainer.innerHTML = '';

        if (folder) {
            const backButton = createElement(`
                <button class="p-4 rounded-lg border-2 flex items-center justify-center cursor-pointer" style="background: #444444;">
                    <i class="fa-solid fa-arrow-left" style="color: white; font-size: 1.5rem;"></i>
                </button>
            `);
            backButton.addEventListener("click", () => renderRewards());
            rewardsContainer.appendChild(backButton);

            rewardsData.filter(reward => reward.reward_folder === folder).forEach(renderReward);
        } else {
            Object.entries(folders).forEach(([key, value]) => {
                const folderButton = createElement(`
                    <button id="YTCRfolder_${key}" class="p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer" style="background: #333333;">
                        <i class="fa-solid fa-folder text-6xl"></i>
                        <div class="font-bold bg-off_white text-background p-2 text-sm rounded-md shadow-md mt-auto">${value}</div>
                    </button>
                `);
                folderButton.addEventListener("click", () => renderRewards(key));
                rewardsContainer.appendChild(folderButton);
            });

            rewardsData.filter(reward => !reward.reward_folder).forEach(renderReward);
        }
    }

    function renderReward(reward) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        const rewardButton = createElement(`
            <button id="YTCRbutton_${reward.reward_id}" class="p-4 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer" style="background: ${reward.reward_color.background};">
                <div class="font-bold mb-4">${reward.reward_name}</div>
                ${reward.reward_points ? `<div class="font-bold bg-background text-white p-2 text-sm rounded-md shadow-md mt-auto">${reward.reward_points}</div>` : ''}
            </button>
        `);
        rewardButton.addEventListener("click", () => appendToChat('!' + reward.reward_action_chat_message));
        rewardsContainer.appendChild(rewardButton);
    }

    function displayNoCommandsMessage() {
        const chatRenderer = document.querySelector("yt-live-chat-renderer") || document.querySelector("div.Layout-sc-1xcs6mc-0.kILIqT.chat-input");
        if (chatRenderer) {
            chatRenderer.appendChild(createElement(`
                <div id="YTCRMain" class="text-center break-words p-2">
                    <div class="flex justify-between p-2 col-span-full font-bold">
                        <span class="text-red-600">You don't have this channel's commands. If you want to inform them about the extension, send them over to the <a href="https://github.com/ZLGNF/YTCRemake" class="underline">GitHub</a></span>
                    </div>
                </div>
            `));
        }
    }

    function findChannelName(callback, regex, localStorageKey) {
        const url = window.location.href;
        const match = url.match(regex);

        if (match && match[1]) {
            const channelName = match[1];
            localStorage.setItem(localStorageKey, channelName);
            console.log("Channel Name:", channelName);
            callback(channelName);
        } else {
            console.log("Channel Name not found in URL. Waiting...");
            setTimeout(() => findChannelName(callback, regex, localStorageKey), 1000);
        }
    }

    function findYouTubeChannelId(callback) {
    const data = parent.ytInitialData || parent.ytcfg?.data_;
    let channelId;

    try {
        if (data) {
            if (data.contents?.twoColumnWatchNextResults?.results?.results?.contents[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.title?.runs[0]?.navigationEndpoint?.browseEndpoint?.browseId) {
                channelId = data.contents.twoColumnWatchNextResults.results.results.contents[1]
                    .videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0]
                    .navigationEndpoint.browseEndpoint.browseId;
                
                if (channelId === localStorage.getItem("ytcr_channel_id")) {
                    localStorage.removeItem("ytcr_channel_id");
                    window.top.location.reload();
                    return; // Stop further execution
                }
            } else if (data.CHANNEL_ID) {
                channelId = data.CHANNEL_ID;
            }

            if (channelId) {
                console.log("YouTube Channel ID:", channelId);
                localStorage.setItem("ytcr_channel_id", channelId);
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
        setTimeout(() => findYouTubeChannelId(callback), 1000);
    } catch (error) {
        console.error("Error occurred while trying to find Channel ID:", error);
    }
}

    function initializePlatform(platform) {
        displayNoCommandsMessage();
        platform.channelNameFinder(channelName => {
            window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

            window.addEventListener("message", (event) => {
                if (event.source !== window) return;

                if (event.data && event.data.source === "contentScript.js" && event.data.message === "rewardsData") {
                    const { data } = event.data;
                    if (data) {
                        rewardsData = data.rewardsData;
                        folders = data.folders;

                        const chatRenderer = document.querySelector(platform.chatRendererSelector);
                        if (chatRenderer) {
                            document.getElementById("YTCRMain").remove();
                            chatRenderer.appendChild(createElement(platform.mainTemplate));
                            document.getElementById("PointsButton").addEventListener("click", () => {
                                const rewardsContainer = document.getElementById("YTCRDropdown");
                                rewardsContainer.classList.toggle("hidden");
                                if (!rewardsContainer.classList.contains("hidden")) {
                                    renderRewards();
                                }
                            });
                            document.getElementById("ClipButton").addEventListener("click", () => appendToChat('!clip'));
                        }
                    } else {
                        console.log("No rewards data available.");
                    }
                }
            });
        });
    }

    const platforms = {
        youtube: {
            channelNameFinder: findYouTubeChannelId,
            chatRendererSelector: "yt-live-chat-renderer",
            mainTemplate: `
                <div id="YTCRMain" class="text-center break-words p-2">
                    <div id="buttons" class="flex justify-between p-2 col-span-full font-bold">
                        <button id="PointsButton" class="bg-primary px-2 rounded-lg hover cursor-pointer">Rewards</button>
                        <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none">
                            <i class="fa-solid fa-clapperboard mr-1"></i>Clip
                        </button>
                    </div>
                    <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3 hidden"></div>
                </div>
            `
        },
        twitch: {
            channelNameFinder: (callback) => findChannelName(callback, /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(?:popout\/)?([^\/?]+)/i, "ytcr_channel_id"),
            chatRendererSelector: ".chat-input",
            mainTemplate: `
                <div id="YTCRMain" class="text-center break-words p-2">
                    <div id="buttons" class="flex justify-between p-2 col-span-full font-bold">
                        <button id="PointsButton" class="bg-primary px-2 rounded-lg hover cursor-pointer">Rewards</button>
                        <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none">
                            <i class="fa-solid fa-clapperboard mr-1"></i>Clip
                        </button>
                    </div>
                    <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3 hidden"></div>
                </div>
            `
        }
    };

    function initializeExtension() {
        const isYouTube = window.location.hostname.includes('youtube.com');
        const isTwitch = window.location.hostname.includes('twitch.tv');

        if (isYouTube) {
            initializePlatform(platforms.youtube);
        } else if (isTwitch) {
            initializePlatform(platforms.twitch);
        }
    }

    function tryInitialize() {
        if (!document.getElementById("YTCRMain")) {
            initializeExtension();
        } else {
            console.log("YTCR Extension already initialized.");
        }
    }

    const initializeInterval = setInterval(tryInitialize, 1000);

    const chatObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.target.id === 'YTCRMain' && mutation.type === 'childList') {
                clearInterval(initializeInterval);
                initializeExtension();
            }
        });
    });

    const chatObserverTarget = document.querySelector(".chat-input") || document.querySelector("yt-live-chat-renderer");
    chatObserver.observe(chatObserverTarget, { childList: true });

})();