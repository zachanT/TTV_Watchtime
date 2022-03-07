/**
 * Basic logic from what I understand about extensions:
 * Record time when a channel is selected in Twitch
 * Not sure how to detect if the channel is changed
 *  When it does change record time and calculate watch time, store in localStorage (maybe database later)
 *  Record time of new channel
 * 
 */

//  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//  chrome.scripting.executeScript({
//      target: { tabId: tab.id },
//      function: setPageBackgroundColor,
//  });

function stuff() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        console.log("HELLO")
        console.log(tabs[0].id.url)
    });
}

chrome.runtime.onInstalled.addListener(() => {
    stuff()
});

console.log("WHEN DOES THIS EXECUTE?")