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
        const tempInput = document.createElement('textarea');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showNotification('Copied to clipboard: ' + text);
    }

    function appendToChat(message) {
        if (window.location.hostname.includes('youtube.com')) {
            let chatInput = document.querySelector('div#input[contenteditable]') ||
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

            rewardsData.filter(reward => reward.reward_folder === folder)
                .forEach(renderReward);
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

            rewardsData.filter(reward => !reward.reward_folder)
                .forEach(renderReward);
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
            const messageDiv = createElement(`
                <div id="YTCRMain" class="text-center break-words p-2">
                    <div class="flex justify-between p-2col-span-full font-bold">
                        <span class="text-red-600">If you are reading this and have this streamer's commands, try reloading this page! If you don't, tell them to go to <a href="https://github.com/ZLGNF/YTCRemake" class="underline">our GitHub</a></span>
                    </div>
                </div>
            `);
            chatRenderer.appendChild(messageDiv);
        }
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
                    return; // Exit function if channelId is found
                }
            }

            console.log("ytInitialData or ytcfg data not found or Channel ID not found. Trying to get channelId from localStorage...");
            channelId = localStorage.getItem("ytcr_channel_id"); // Try to get channelId from localStorage
            if (channelId) {
                console.log("Channel ID found in localStorage:", channelId);
                callback(channelId);
                return; // Exit function if channelId is found in localStorage
            }

            console.log("Channel ID not found in localStorage. Waiting...");
            setTimeout(() => findChannelId(callback), 1000);
        } catch (error) {
            console.error("Error occurred while trying to find Channel ID:", error);
        }
    }

    function initializeYouTube() {
        displayNoCommandsMessage();
        findChannelId(channelId => {
            // Send message to contentScript.js to fetch rewards data
            window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

            // Listen for rewards data
            window.addEventListener("message", (event) => {
                // We only accept messages from the same frame
                if (event.source !== window) {
                    return;
                }

                if (event.data && event.data.source === "contentScript.js" && event.data.message === "rewardsData") {
                    const { data } = event.data;
                    if (data) {
                        rewardsData = data.rewardsData;
                        folders = data.folders;

                        const chatRenderer = document.querySelector("yt-live-chat-renderer");
                        if (chatRenderer) {
                            document.getElementById("YTCRMain").remove();
                            chatRenderer.appendChild(createElement(`
                                <div id="YTCRMain" class="text-center break-words p-2">
                                    <div id="buttons" class="flex justify-between p-2 col-span-full font-bold">
                                        <button id="PointsButton" class="bg-primary px-2 rounded-lg hover cursor-pointer">Rewards</button>
                                        <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none">
                                            <i class="fa-solid fa-clapperboard mr-1"></i>Clip
                                        </button>
                                    </div>
                                    <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3 hidden"></div>
                                </div>
                            `));
                            document.getElementById("PointsButton").addEventListener("click", () => {
                                const rewardsContainer = document.getElementById("YTCRDropdown");
                                if (rewardsContainer.classList.contains("hidden")) {
                                    renderRewards();
                                    rewardsContainer.classList.remove("hidden");
                                } else {
                                    rewardsContainer.classList.add("hidden");
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

    function initializeTwitch() {
        displayNoCommandsMessage();
        findTwitchChannelName(channelName => {
            // Send message to contentScript.js to fetch rewards data
            window.postMessage({ source: "main.js", message: "initiateFetching" }, "*");

            // Listen for rewards data
            window.addEventListener("message", (event) => {
                // We only accept messages from the same frame
                if (event.source !== window) {
                    return;
                }

                if (event.data && event.data.source === "contentScript.js" && event.data.message === "rewardsData") {
                    const { data } = event.data;
                    if (data) {
                        rewardsData = data.rewardsData;
                        folders = data.folders;

                        const chatRenderer = document.querySelector(".chat-input");
                        if (chatRenderer) {
                            document.getElementById("YTCRMain").remove();
                            chatRenderer.appendChild(createElement(`
                                <div id="YTCRMain" class="text-center break-words p-2">
                                    <div id="buttons" class="flex justify-between p-2 col-span-full font-bold">
                                        <button id="PointsButton" class="bg-primary px-2 rounded-lg hover cursor-pointer">Rewards</button>
                                        <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none">
                                            <i class="fa-solid fa-clapperboard mr-1"></i>Clip
                                        </button>
                                    </div>
                                    <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3 hidden"></div>
                                </div>
                            `));
                            document.getElementById("PointsButton").addEventListener("click", () => {
                                const rewardsContainer = document.getElementById("YTCRDropdown");
                                if (rewardsContainer.classList.contains("hidden")) {
                                    renderRewards();
                                    rewardsContainer.classList.remove("hidden");
                                } else {
                                    rewardsContainer.classList.add("hidden");
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

    function initializeExtension() {
        const isYouTube = window.location.hostname.includes('youtube.com');
        const isTwitch = window.location.hostname.includes('twitch.tv');

        if (isYouTube) {
            initializeYouTube();
        } else if (isTwitch) {
            initializeTwitch();
        }
    }

    function tryInitialize() {
        if (!document.getElementById("YTCRMain")) {
            initializeExtension();
        } else {
            console.log("YTCR Extension already initialized.");
        }
    }

    // Try to initialize periodically until it succeeds
    const initializeInterval = setInterval(tryInitialize, 1000);

    // MutationObserver to detect when the extension menu is removed and re-added
    const chatObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.target.id === 'YTCRMain' && mutation.type === 'childList') {
                clearInterval(initializeInterval); // Clear the initializeInterval
                initializeExtension(); // Re-initialize the extension
            }
        });
    });

    // Observe changes in the chat area
    const chatObserverTarget = document.querySelector(".chat-input") || document.querySelector("yt-live-chat-renderer");
    chatObserver.observe(chatObserverTarget, { childList: true });

})();
