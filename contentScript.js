(() => {
    function injectMainScript() {
        console.log("Injecting main.js");
        const head = document.getElementsByTagName("head")[0];

        // Inject main script
        const mainScript = document.createElement("script");
        mainScript.type = "text/javascript";
        mainScript.src = chrome.runtime.getURL("main.js");
        mainScript.id = "gezel_youtube";
        head.appendChild(mainScript);
        console.log("main.js appended to head");

        // Inject Tailwind CSS
        const tailwindCSS = document.createElement("link");
        tailwindCSS.rel = "stylesheet";
        tailwindCSS.href = chrome.runtime.getURL("tailwind.css");
        tailwindCSS.id = "gezel_youtube_tailwind";
        head.appendChild(tailwindCSS);
        console.log("Tailwind CSS appended to head");

        // Inject Font Awesome CSS
        const fontAwesomeCSS = document.createElement("link");
        fontAwesomeCSS.rel = "stylesheet";
        fontAwesomeCSS.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        fontAwesomeCSS.id = "gezel_youtube_fontawesome";
        head.appendChild(fontAwesomeCSS);
        console.log("Font Awesome CSS appended to head");
    }

    function fetchAndConvertToDataURL(url) {
        console.log(`Fetching and converting URL to Data URL: ${url}`);
        return fetch(url)
            .then(response => response.blob())
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log(`Finished reading blob as Data URL`);
                    resolve(reader.result);
                };
                reader.onerror = (error) => {
                    console.error(`Error reading blob as Data URL: ${error}`);
                    reject(error);
                };
                reader.readAsDataURL(blob);
            }));
    }

    function fetchRewardsData(url, callback) {
        console.log(`Fetching rewards data from: ${url}`);
        fetch(url)
            .then(response => response.text())
            .then(text => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                const rewardsData = [];
                const folders = {};

                const rewards = xmlDoc.getElementsByTagName("reward");
                for (let reward of rewards) {
                    const folder = reward.getElementsByTagName("reward_folder")[0]?.textContent;
                    if (folder && !folders[folder]) {
                        folders[folder] = folder;
                    }
                    rewardsData.push({
                        reward_id: reward.getElementsByTagName("reward_id")[0].textContent,
                        reward_name: reward.getElementsByTagName("reward_name")[0].textContent,
                        reward_action_chat_message: reward.getElementsByTagName("reward_action_chat_message")[0].textContent,
                        reward_folder: folder,
                        reward_points: reward.getElementsByTagName("reward_points")[0]?.textContent || null,
                        reward_color: {
                            background: reward.getElementsByTagName("background")[0].textContent
                        }
                    });
                }
                console.log("Rewards data fetched and parsed:", rewardsData);
                console.log("Folders:", folders);

                // Send the fetched data back to main.js
                callback({ rewardsData, folders });
            })
            .catch(error => {
                console.error("Error fetching rewards data:", error);
                callback(null);
            });
    }

    // Inject main.js immediately
    injectMainScript();

    // Listen for messages from main.js
    window.addEventListener("message", (event) => {
        // We only accept messages from the same frame
        if (event.source !== window) {
            return;
        }

        if (event.data && event.data.source === "main.js" && event.data.message === "initiateFetching") {
            console.log("Initiating fetching of commands...");
            const channelInfo = localStorage.getItem("ytcr_channel_id");

            if (channelInfo) {
                console.log(`Channel info found: ${channelInfo}`);
                console.log(`Fetching ${channelInfo}'s commands`);

                if (channelInfo === "UCnzGxHoqeD69OQjnf0oUhtw" || channelInfo === "zlgnf") {
                    const commandsXMLURL = "https://raw.githubusercontent.com/ZLGNF/YTCRemake/main/commands.xml";
                    fetchRewardsData(commandsXMLURL, (data) => {
                        window.postMessage({ source: "contentScript.js", message: "rewardsData", data }, "*");
                    });
                } else {
                    const baseCommandsXMLURL = chrome.runtime.getURL(`commands/${channelInfo}.xml`);
                    console.log(`Attempting to fetch commands file from: ${baseCommandsXMLURL}`);
                    fetch(baseCommandsXMLURL)
                        .then(response => {
                            if (response.ok) {
                                console.log(`Found commands file for ${channelInfo}: ${baseCommandsXMLURL}`);
                                fetchRewardsData(baseCommandsXMLURL, (data) => {
                                    window.postMessage({ source: "contentScript.js", message: "rewardsData", data }, "*");
                                });
                            } else {
                                console.log(`No specific commands file found for ${channelInfo}. The user doesn't have commands for this channel.`);
                                window.postMessage({ source: "contentScript.js", message: "rewardsData", data: null }, "*");
                            }
                        })
                        .catch(error => {
                            window.postMessage({ source: "contentScript.js", message: "rewardsData", data: null }, "*");
                        });
                }
            } else {
                console.log("No channel info found in localStorage.");
                window.postMessage({ source: "contentScript.js", message: "rewardsData", data: null }, "*");
            }
        }
    });
})();