/**
 * Basic logic from what I understand about extensions:
 * Record time when a channel is selected in Twitch
 * Not sure how to detect if the channel is changed
 *  When it does change record time and calculate watch time, store in localStorage (maybe database later)
 *  Record time of new channel
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
        console.log("url changed: " + changeInfo.url);
        let url = changeInfo.url;
        let regex = /https:\/\/www.twitch.tv\//;
        let ind = url.search(regex);
        if(ind != -1) {
            let channel = url.substr(22);
            console.log("Watching: " + channel);
            if(channel != "" || channel != "directory") {                
            // If url is a twitch channel...
                if(tabsOnTwitch.indexOf(tabId) != -1) {
                // if current tab was just watching a channel
                    recordTimeWatched(channel, tabId);
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
            
            // If tab was watching recordWatchTime
        }
        // WORRY ABOUT LATER BUT STILL NOTE:
        // if multiple tabs are watching twitch record time separately
    }
});

function recordTimeWatched (channel, tabId) {
    // tabsOnTwitch = tabsOnTwitch.filter(num => num != tabId);
    let sessionTime = Date.now() - channels[channel]; // Watch time in ms
    chrome.storage.sync.get(['twitchWatchTime'], (result) => {
        let watchTime = result.twitchWatchTime;

        let ind = watchTime.indexOf(channel);
        if(ind != -1) {
            watchTime[ind][channel] += sessionTime;
            // chrome.storage.sync.set({channel: (result[channel] + sessionTime)}, () => {
            //     console.log("Watched " + channel + " for " + sessionTime/1000 + "sec(s)");
            // });
        } else {
            watchTime.push({ channel: sessionTime });
            // chrome.storage.sync.set({channel: sessionTime}, () => {
            //     console.log("Watched " + channel + " for " + sessionTime/1000 + "sec(s)");
            // });
        }
        chrome.storage.sync.set({'twitchWatchTime': watchTime}, () => {
            console.log("Watched " + channel + " for " + sessionTime/1000 + "sec(s)");
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
    delete channels[channel];

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

// function stuff() {
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
});