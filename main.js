function appendToChat(message) {
  var chatInput = document.querySelector('div#input[contenteditable]');
  if (chatInput == null) {
    var iframe = document.querySelector("#chatframe");
    if (iframe != null) {
      var l = iframe.contentDocument || iframe.contentWindow.document;
      chatInput = l.querySelector('div#input[contenteditable]');
    }
  }

  // Clear the chat input
  chatInput.innerHTML = '';

  // Append the message directly to the chat input
  chatInput.focus();
  document.execCommand('insertText', false, message);

  console.log('Message appended to chat:', message);
}

(() => {
  "use strict";

  // Add this console log statement
  console.log("YTCR Extension content script loaded.");

  // Function to fetch and parse XML data from GitHub
  async function fetchRewards() {
    const response = await fetch('https://raw.githubusercontent.com/rxduarte/alert-extension/YTCR/commands.xml?token=GHSAT0AAAAAACRWEPF6VU7OX2GXCLNPJK5MZSONLKA');
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    return xmlDoc.getElementsByTagName("reward");
  }

  const e = {
    AddDiv: (rewards) => {
      let t = document.createElement("div");
      t.className = "text-center break-words p-2";
      t.id = "YTCRMain";
      let htmlContent = `<div id="buttons">
        <div class="flex justify-between p-2 col-span-full font-bold">
          <btn id="PointsButton" class="bg-primary px-2 rounded-lg pointer-events-none hover cursor-pointer">Rewards</btn>
          <button id="ClipButton" class="bg-primary px-2 rounded-lg text-white hover cursor-pointer disabled:bg-background disabled:pointer-events-none"><i class="fa-solid fa-clapperboard mr-1"></i>Clip</button>
        </div>
      </div>
      <div id="YTCRDropdown" class="m-2 col-span-full grid grid-cols-4 gap-3"></div>`;
      t.innerHTML = htmlContent;

      // Populate rewards
      const dropdown = t.querySelector("#YTCRDropdown");
      rewards.forEach(reward => {
        const rewardId = reward.getElementsByTagName("reward_id")[0].childNodes[0].nodeValue;
        const rewardName = reward.getElementsByTagName("reward_name")[0].childNodes[0].nodeValue;
        const rewardActionChatMessage = reward.getElementsByTagName("reward_action_chat_message")[0].childNodes[0].nodeValue;
        const rewardFolder = reward.getElementsByTagName("reward_folder")[0]?.childNodes[0]?.nodeValue;
        const rewardPoints = reward.getElementsByTagName("reward_points")[0].childNodes[0].nodeValue;
        const rewardColor = reward.getElementsByTagName("reward_color")[0]?.getElementsByTagName("background")[0]?.childNodes[0]?.nodeValue || "#c9574e";

        const button = document.createElement("button");
        button.id = `YTCRbutton_${rewardId}`;
        button.dataset.points = rewardPoints;
        button.dataset.bg = rewardColor;
        button.dataset.font = "white";
        button.dataset.id = rewardId;
        button.dataset.name = rewardName;
        button.className = "p-4 rounded-lg border-2 flex flex-col items-center justify-center aspect-w-2 aspect-h-2 cursor-pointer";
        button.style.background = rewardColor;
        button.style.color = "white";
        button.innerHTML = `
          <div id="name" class="font-bold mb-4">${rewardName}</div>
          <div id="cost" class="font-bold bg-background text-white p-2 text-sm rounded-md shadow-md mt-auto">${rewardPoints}</div>
        `;

        button.addEventListener("click", () => {
          appendToChat(`!${rewardActionChatMessage}`);
        });

        dropdown.appendChild(button);
      });

      return t;
    }
  };

  function initialize() {
    fetchRewards().then(rewards => {
      if (!document.getElementById("YTCRMain")) {
        let o = document.querySelector("yt-live-chat-renderer");
        o.appendChild(e.AddDiv(rewards));
      }
    });
  }

  // Initialization
  initialize();
})();
