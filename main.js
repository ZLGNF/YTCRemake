function appendToChat(message) {
    var chatInput = document.querySelector('div#input[contenteditable]');
    if (chatInput == null) {
        var iframe = document.querySelector("#chatframe");
        if (iframe != null) {
            var l = iframe.contentDocument || iframe.contentWindow.document;
            chatInput = l.querySelector('div#input[contenteditable]');
        }
    }
    chatInput.innerHTML = '';
    chatInput.focus();
    document.execCommand('insertText', false, message);
    console.log('Message appended to chat:', message);
}

(() => {
    "use strict";

    console.log("YTCR Extension content script loaded.");

    const rewardsDataUrl = "https://raw.githubusercontent.com/ZLGNF/YTCRemake/main/commands.xml";
    let rewardsData = [];
    let folders = {};

    const e = {
        AddDiv: (e) => {
            let t = document.createElement("div");
            return (
                (t.className = "text-center break-words p-2"),
                (t.id = "YTCRMain"),
                (t.innerHTML = `
                    <div id="buttons">
                        <div class="flex justify-between p-2 col-span-full font-bold">
                            <btn id="PointsButton" class="bg-primary px-2 rounded-lg hover cursor-pointer">Rewards</btn>
                            <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none">
                                <i class="fa-solid fa-clapperboard mr-1"></i>Clip
                            </button>
                        </div>
                    </div>
                    <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3 hidden"></div>
                `),
                t
            );
        }
    };

    async function fetchRewardsData() {
        try {
            const response = await fetch(rewardsDataUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const rewards = xmlDoc.getElementsByTagName("reward");
            for (let i = 0; i < rewards.length; i++) {
                const reward = rewards[i];
                const folder = reward.getElementsByTagName("reward_folder")[0].textContent;
                if (folder) {
                    if (!folders[folder]) {
                        folders[folder] = folder;
                    }
                }
                rewardsData.push({
                    reward_id: reward.getElementsByTagName("reward_id")[0].textContent,
                    reward_name: reward.getElementsByTagName("reward_name")[0].textContent,
                    reward_action_chat_message: reward.getElementsByTagName("reward_action_chat_message")[0].textContent,
                    reward_folder: folder,
                    reward_points: reward.getElementsByTagName("reward_points")[0].textContent || null, // Set to null if points are not specified
                    reward_color: {
                        background: reward.getElementsByTagName("background")[0].textContent
                    }
                });
            }
            console.log("Rewards data fetched and parsed:", rewardsData);
            console.log("Folders:", folders);
        } catch (error) {
            console.error("Error fetching rewards data:", error);
        }
    }

    function initializeYTCR() {
        if (!document.getElementById("YTCRMain")) {
            let chatRenderer = document.querySelector("yt-live-chat-renderer");
            if (chatRenderer) {
                chatRenderer.appendChild(e.AddDiv());
                document.getElementById("PointsButton").addEventListener("click", function () {
                    console.log("Points Button clicked!");
                    const rewardsContainer = document.getElementById("YTCRDropdown");
                    if (rewardsContainer.classList.contains("hidden")) {
                        renderRewards();
                        rewardsContainer.classList.remove("hidden");
                    } else {
                        rewardsContainer.classList.add("hidden");
                    }
                });
                document.getElementById("ClipButton").addEventListener("click", function () {
                    console.log("Clip Button clicked!");
                    appendToChat('!clip');
                });
            } else {
                console.log("Could not find chat renderer element.");
            }
        } else {
            console.log("YTCRMain element already exists.");
        }
    }

    function renderRewards(folder) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        rewardsContainer.innerHTML = ''; // Clear existing rewards or folders

        if (folder) {
            let backButton = document.createElement("button");
            backButton.classList.add("p-4", "rounded-lg", "border-2", "flex", "items-center", "justify-center", "cursor-pointer");
            backButton.style.background = "#444444"; // Back button color
            backButton.innerHTML = `
                <i class="fa-solid fa-arrow-left" style="color: white; font-size: 1.5rem;"></i>
            `;
            backButton.addEventListener("click", function () {
                console.log("Back Button clicked!");
                renderRewards();
            });
            rewardsContainer.appendChild(backButton);

            rewardsData.filter(reward => reward.reward_folder === folder).forEach(reward => {
                renderReward(reward);
            });
        } else {
            Object.entries(folders).forEach(([key, value]) => {
                let folderButton = document.createElement("button");
                folderButton.id = `YTCRfolder_${key}`;
                folderButton.classList.add("p-4", "rounded-lg", "border-2", "flex", "flex-col", "items-center", "justify-center", "cursor-pointer");
                folderButton.style.background = "#333333"; // Darker folder button color
                folderButton.innerHTML = `
                    <i class="fa-solid fa-folder text-6xl"></i>
                    <div class="font-bold bg-off_white text-background p-2 text-sm rounded-md shadow-md mt-auto">${value}</div>
                `;
                folderButton.addEventListener("click", function () {
                    console.log(`Folder Button clicked! Folder: ${key}`);
                    renderRewards(key);
                });
                rewardsContainer.appendChild(folderButton);
            });

            rewardsData.filter(reward => !reward.reward_folder).forEach(reward => {
                renderReward(reward);
            });
        }
    }

    function renderReward(reward) {
        const rewardsContainer = document.getElementById("YTCRDropdown");
        let button = document.createElement("button");
        button.id = `YTCRbutton_${reward.reward_id}`;
        button.classList.add("p-4", "rounded-lg", "border-2", "flex", "flex-col", "items-center", "justify-center", "cursor-pointer");
        button.style.background = reward.reward_color.background;
        button.innerHTML = `
            <div class="font-bold mb-4">${reward.reward_name}</div>
            ${reward.reward_points ? `<div class="font-bold bg-background text-white p-2 text-sm rounded-md shadow-md mt-auto">${reward.reward_points}</div>` : ''}
        `;
        button.addEventListener("click", function () {
            console.log(`Reward Button clicked! Reward ID: ${reward.reward_id}`);
            appendToChat('!' + reward.reward_action_chat_message);
        });
        rewardsContainer.appendChild(button);
    }

    // Fetch rewards data and initialize the extension
    fetchRewardsData().then(initializeYTCR);

})();
