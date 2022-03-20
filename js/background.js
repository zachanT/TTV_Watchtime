/**
 * Should optimize code, only access storage if required
 * Think basic functionality works
 * 
 * Using a DB: https://stackoverflow.com/questions/5769081/connecting-to-db-from-a-chrome-extension
 */

let tabsOnTwitch; // Array of tabId of tabs with Twitch open
let channels; // JSON object acting as a list of channels being watched and time when they began being watched
// let watchTime = {}; // watchtime in ms (maybe switch to actual DB in future)
let tabIdToChannel; // JSON object mapping from tabId to twitch channel 

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(changeInfo.url) {        
        console.log(changeInfo);
        console.log("url changed: " + changeInfo.url);
        let url = changeInfo.url;
        let regex = /https:\/\/www.twitch.tv\//;
        let ind = url.search(regex);

        // Retrieve data from localStorate 
        chrome.storage.local.get(['tabsOnTwitch', 'channelsBeingWatched', 'tabIdToChannel'], (data) => {
            console.log("Got data");
            if(!tabsOnTwitch)
                tabsOnTwitch = data.tabsOnTwitch;
            if(!channels)
                channels = data.channelsBeingWatched;
            if(!tabIdToChannel)
                tabIdToChannel = data.tabIdToChannel;

            if(ind != -1) {
                let channel = url.substr(22);                

                console.log("Watching: " + channel);
                console.log(tabsOnTwitch);
                console.log(channels);
                // NEED BETTER WAY TO DO THIS, (IF TWITCH CHANNEL CONTAINS THESE WORDS)
                if(channel != "" && !channel.toLowerCase().includes("directory") && !channel.toLowerCase().includes("videos")
                    && !channel.toLowerCase().includes("settings") && !channel.toLowerCase().includes("p/")) {
                    // If url is a twitch channel...

                    if(tabsOnTwitch.indexOf(tabId) != -1) {
                    // if current tab was just watching a channel
                        console.log("This tab was watching " + tabIdToChannel[tabId]);
                        recordTimeWatched(tabIdToChannel[tabId], tabId);
                    } else {
                        tabsOnTwitch.push(tabId);
                    }

                    tabIdToChannel[tabId] = channel;

                    if(!(channel in channels)) {
                        // If no other tab is watching this channel record start time
                        channels[channel] = Date.now();
                    } // if a channel is already watching this channel, keep original start time
                }

                chrome.storage.local.set({'tabsOnTwitch': tabsOnTwitch}, () => {/*console.log("Updated tabsOnTwitch")*/});
            } else {
                // URL cannot be a twitch channel
                console.log("Navigating to a site that isn't twitch");
                let channel = tabIdToChannel[tabId];
                if(channel) {
                    // If tab was watching recordWatchTime
                    tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId);
                    recordTimeWatched(channel, tabId);
                }                
            }
        });
        chrome.storage.local.set({'channelsBeingWatched': channels}, () => {/*console.log("Updated channelsBeingWatched")*/});
        chrome.storage.local.set({'tabIdToChannel': tabIdToChannel}, () => {/*console.log("Updated tabIdToChannel")*/});
    }
});

async function recordTimeWatched (channelName, tabId) {
    // tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId);
    let sessionTime = Date.now() - channels[channelName]; // Watch time in ms
    chrome.storage.sync.get(['twitchWatchTime'], (result) => {
        let watchTimes = result.twitchWatchTime;

        let ind = -1;
        if(watchTimes) {
            // Search watchTimes for channelName
            for(let i = 0; i < watchTimes.length; ++i) {
                if(watchTimes[i].channel == channelName) {
                    ind = i;
                    break;
                }
            }
        } else {
            // Initialize watchTimes if chrome.storage is empty
            watchTimes = [];
        }

        if(ind != -1) {
            // Update watchTime for channel
            if(watchTimes[ind].watchTime) {
                watchTimes[ind].watchTime += sessionTime;
            } else {
                watchTimes[ind].watchTime = sessionTime;
            }
        } else {
            // Create new entry in array for channel
            watchTimes.push({ 'channel': channelName, 'watchTime': sessionTime });
        }
        chrome.storage.sync.set({'twitchWatchTime': watchTimes}, () => {
            console.log("Watched " + channelName + " for " + sessionTime/1000 + "sec(s)");
        });
    });
    delete channels[channelName];

    // Unmap tabId to channel
    delete tabIdToChannel[tabId];
    return;
}

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.get(['tabsOnTwitch', 'channelsBeingWatched', 'tabIdToChannel'], (data) => {
        if(!tabsOnTwitch)
            tabsOnTwitch = data.tabsOnTwitch;
        if(!channels)
            channels = data.channelsBeingWatched;
        if(!tabIdToChannel)
            tabIdToChannel = data.tabIdToChannel;

        // Check if current tab is watching twitch
        if(tabsOnTwitch.indexOf(tabId) != -1) {
            let channel = tabIdToChannel[tabId];            
            console.log(tabId + " was watching twitch.tv/" + channel);

            // Check if another tab is watching this channel
            const tabIds = Object.keys(tabIdToChannel);
            let anotherTabWatching = false;
            console.log(tabIds);
            tabIds.forEach(id => {
                console.log(id);
                if (tabIdToChannel[id] == channel && tabId != id) {
                    console.log("Another tab watching this channel");
                    anotherTabWatching = true;
                }
            });

            // Only record time if no other tab is watching
            if(!anotherTabWatching) {
                recordTimeWatched(channel, tabId);
            } else {
                delete tabIdToChannel[tabId];
            }

            tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId); // remove tabId from tabsOnTwitch
            console.log("tabsOnTwitch after tab removed: ");
            console.log(tabsOnTwitch);
    
            chrome.storage.local.set({'tabsOnTwitch': tabsOnTwitch}, () => console.log("Updated tabsOnTwitch after tab closed"));
            chrome.storage.local.set({'channelsBeingWatched': channels}, () => console.log("Updated channelsBeingWatched after tab closed"));
            chrome.storage.local.set({'tabIdToChannel': tabIdToChannel}, () => console.log("Updated tabIdToChannel after tab closed"));
        }
    });
})

chrome.runtime.onInstalled.addListener((details) => {
    //On boarding stuff when user installs extension
    // chrome.tabs.create({
    //     url: 'onboarding.html'
    // });

    chrome.storage.sync.remove("twitchWatchTime", () => console.log("removed twitchWatchTime"));
    if(details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.storage.local.set({'tabsOnTwitch': []}, () => console.log("Initialized tabsOnTwitch"));
        chrome.storage.local.set({'channelsBeingWatched': {}}, () => console.log("Initialized channelsBeingWatched"));
        chrome.storage.local.set({'tabIdToChannel': {}}, () => console.log("Initialized tabIdToChannel"));
    }
});