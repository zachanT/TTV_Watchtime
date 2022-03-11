/**
 * Watchtime isn't being properly recorded when a tab was watching a twitch channel but switches to another twitch
 * channel. 
 * Seems like time is only being recorded when tab is closed.
 * Haven't tested if you watch twitch but switch to another site.
 * 
 * Using a DB: https://stackoverflow.com/questions/5769081/connecting-to-db-from-a-chrome-extension
 */

let tabsOnTwitch = []; // tabId of tabs with Twitch open
let channels = {}; // list of channels being watched and time when they began being watched
// let watchTime = {}; // watchtime in ms (maybe switch to actual DB in future)
let tabIdToChannel = {}; // mapping from tabId to twitch channel

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
        if(ind != -1) {
            let channel = url.substr(22);
            console.log("Watching: " + channel);
            console.log(tabsOnTwitch);
            console.log(channels);
            if(channel != "" && !channel.toLowerCase().includes("directory")) {                
            // If url is a twitch channel...
                if(tabsOnTwitch.indexOf(tabId) != -1) {
                // if current tab was just watching a channel
                    recordTimeWatched(tabIdToChannel[tabId], tabId);
                } else {
                    tabsOnTwitch.push(tabId);
                }

                tabIdToChannel[tabId] = channel;

                // Query to see if channel exists in DB
                // if(channel in watchTime) {
                // }

                if(channel in channels) {
                    // If another tab is already watching this channel, record time and create a
                    // new start time
                    recordTimeWatched(channel, tabId);
                }
                channels[channel] = Date.now();
            }
        } else {
            // URL cannot be a twitch channel
            console.log("Navigating to a site that isn't twitch");
            let channel = tabIdToChannel[tabId];
            if(channel) {
                // If tab was watching recordWatchTime
                recordTimeWatched(channel, tabId);
            }
            
        }
        // WORRY ABOUT LATER BUT STILL NOTE:
        // if multiple tabs are watching twitch record time separately
    }
});

function recordTimeWatched (channelName, tabId) {
    // tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId);
    let sessionTime = Date.now() - channels[channelName]; // Watch time in ms
    chrome.storage.sync.get(['twitchWatchTime'], (result) => {
        let watchTimes = result.twitchWatchTime;

        // Search watchTimes for channelName
        let ind = -1;
        if(watchTimes) {
            for(let i = 0; i < watchTimes.length; ++i) {
                if(watchTimes[i].channel == channelName) {
                        ind = i;
                        break;
                }
            }
        } else {
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
    // if(channel in watchTime) {
    //     watchTime[channel] += sessionTime;
    // } else {        
    //     chrome.storage.sync.set({channel: sessionTime}, () => {
    //         console.log("Watched " + channel + " for " + sessionTime/1000 + "sec(s)");
    //     });
    // }
    // Remove start time of prev session
    delete channels[channelName];

    // Unmap tabId to channel
    delete tabIdToChannel[tabId];
}

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if(tabsOnTwitch.indexOf(tabId) != -1) {
        console.log(tabId + " was watching twitch");
        let channel = tabIdToChannel[tabId];
        recordTimeWatched(channel, tabId);
        tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId); // remove tabId from tabsOnTwitch
    }
})

// function getURL() {
//     chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
//         console.log("HELLO")
//         console.log(tabs[0].id.url)
//     });
// }

chrome.runtime.onInstalled.addListener(() => {
    //On boarding stuff when user installs extension
    // chrome.tabs.create({
    //     url: 'onboarding.html'
    // });

    chrome.storage.sync.remove("twitchWatchTime", () => console.log("removed twitchWatchTime"));
});