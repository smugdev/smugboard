var updateSLog = require('../../common/slog.js').updateSLog;

var refreshStatus = {
    timer: null,
    currentlyRefreshing: 0,
    justRefreshed: false,
    timeMax: 600,
    lastSet: 31,
    currTime: 31
};

function refreshThread(address, pageStatus, callback){
    if (refreshStatus.currentlyRefreshing == 0){
        refreshStatus.justRefreshed = true;
        refreshStatus.currentlyRefreshing++;
        
        updateSLog(pageStatus[address].sLog, address, -1, callback(address), null);//TODO this precludes refreshing the mods. it should be replaced with something that hooks into the proper page load system
    }
    return false;
}

/*for (let mod of mods){
    mod.loaded = false;
    //add thread thing to queue
    //load each mod
        //each one's callback is to releaseQueued();
}*/

function autoRefresh(address, pageStatus, callback){
    return function(){
        window.clearTimeout(refreshStatus.timer);//TODO This is messy, shouldn't need to do this
        if (document.getElementById('auto_update_status') == null){
            refreshStatus.timer = setTimeout(autoRefresh(address, pageStatus, callback), 1000);
        } else if (refreshStatus.currentlyRefreshing > 0){
            document.getElementById('update_secs').innerHTML = 'Updating...';
            refreshStatus.timer = setTimeout(autoRefresh(address, pageStatus, callback), 1000);
        } else if (document.getElementById('auto_update_status').checked){
            if (refreshStatus.justRefreshed){
                refreshStatus.lastSet = refreshStatus.currTime = 31;
                refreshStatus.justRefreshed = false;
            }
            if (refreshStatus.currTime == 0){
                refreshThread(address, pageStatus, callback);
            } else {
                refreshStatus.currTime--;
                document.getElementById('update_secs').innerHTML = refreshStatus.currTime;
            }
            refreshStatus.timer = setTimeout(autoRefresh(address, pageStatus, callback), 1000);
        } else {
            document.getElementById('update_secs').innerHTML = '';
        }
    };
}

module.exports.refreshStatus = refreshStatus;
module.exports.refreshThread = refreshThread;
module.exports.autoRefresh = autoRefresh;

