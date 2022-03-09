window.onload = () => {
    chrome.storage.sync.get(['twitchWatchTime'], (result) => {
        let watchTimes = result.twitchWatchTime;
        if(!watchTimes) {
            watchTimes = [];
            watchTimes.push({'channel':'xQcOw', 'watchTime': 9000});
        }

        console.log(result);

        watchTimes.sort((a,b) => (a.watchTime < b.watchTime) ? 1 : -1);

        let channelsDiv = document.getElementById("channels");

        watchTimes.forEach(channelTime => {
            let channelDiv = document.createElement("div");
            channelDiv.className = "channel";

            let aChannel = document.createElement("a");
            aChannel.className = "channel_name";
            aChannel.append(channelTime.channel);

            let aWatchTime = document.createElement("a");
            aWatchTime.className = "channel_watchtime";
            let watchTime = channelTime.watchTime / 1000; // seconds
            let hr = parseInt(watchTime / 3600);
            let min = parseInt(watchTime % 3600 / 60);
            let sec = parseInt(watchTime % 3600 % 60);

            aWatchTime.append(hr + "hr " + min + "min " + sec + "sec");

            channelDiv.append(aChannel, aWatchTime);

            channelsDiv.appendChild(channelDiv);
        });
    });
}