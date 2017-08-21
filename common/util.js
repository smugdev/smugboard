var sio = require('../common/sio.js');
var slog = require('../common/slog.js');

funcQueue = {};

//mutex function
function processFuncQueue(myFunc, key){
    if (!funcQueue[key]) {
        funcQueue[key] = [];
    }

    if (myFunc) {
        funcQueue[key].push({func: myFunc, running: false});
    }//myFunc must take (callback)
    
    let somethingRunning = false;
    for (let item of funcQueue[key]) {
        if (item.running == true) {
            somethingRunning = true;
        }
    }
    
    if (!somethingRunning && funcQueue[key].length > 0){
        funcQueue[key][0].running = true;
        funcQueue[key][0].func(() => {
            funcQueue[key].shift();
            processFuncQueue(null, key);
        });
    }
}

function addItemToStateActual(payloadOperation, payloadData, pubkey, state, getNewEntryFunc, callback){
    return function(innerCallback){
        let payload = null;
        if (payloadOperation && payloadData){
            payload = slog.constructPayload(payloadOperation, payloadData, ++state.lastSeqNo);
        }
        
        var newEntry = getNewEntryFunc(state, payload);
        
        //if (payload != null)
        //    newEntry.payload = payload;
        
        //if (sLog.length == 0)
        //newEntry = getNewEntryFunc(payload, state);
        //else
        //    newEntry = getNewEntryFunc(payload, state, sLog[sLog.length - 1])
        
        slog.addToSLog(state.lastAddress, newEntry, function(newAddress){
            state.lastAddress = newAddress;
            //sio.saveObject("slogs/" + pubkey, sLog);
            //console.log(state)
            sio.ipfsPublish(state.lastAddress, state.keyName, pubkey);
            sio.saveObject('states/' + pubkey, state);
            
            if (callback) {
                callback();
            }
                
            innerCallback();
        });        
    };
}

function addItemToState(payloadOperation, payloadData, pubkey, state, getNewEntryFunc, callback){
    processFuncQueue(addItemToStateActual(payloadOperation, payloadData, pubkey, state, getNewEntryFunc, callback), pubkey);
}

/*function addItemToState(payload, pubkey, state, sLog, getNewEntryFunc, callback){//TODO pretty sure some function in threadmanager broke the critical sectionness of this critical section
    //TODO only this function is the critical section, everything else should be async
    //even then, it should be possible to have some sort of mutex locking system (bound to the pubkey)
    //this section could get heavy under actual load, out of everything this is the most expensive part of the codebase right now
    
    //var payload = slog.constructPayload('add', {address: address, seqNo: ++state.lastPostNo});
    var newEntry = getNewEntryFunc(state, payload);
    
    //if (payload != null)
    //    newEntry.payload = payload;
    
    //if (sLog.length == 0)
        //newEntry = getNewEntryFunc(payload, state);
    //else
    //    newEntry = getNewEntryFunc(payload, state, sLog[sLog.length - 1])
    
    slog.addToSLog(sLog, state.lastAddress, newEntry, function(newAddress){
        state.lastAddress = newAddress;
        console.log('new address: ');console.log(state.lastAddress);
        sio.saveObject("slogs/" + pubkey, sLog);
        //console.log(state)
        sio.ipfsPublish(state.lastAddress, state.keyFile);
        sio.saveObject("states/" + pubkey, state);
        
        if (callback != null)
            callback();
    });

}*/

function addGlobally(pubkey, state, globalStates, publishImmediately, scrubFunc, callback){
    /*if (pubkey != null)
        state.keyFile = 'keys/' + pubkey + '.key';
    else
        pubkey = 'QmMyLocalIPFSnodeID';//TODO remove this*/
    
    globalStates[pubkey] = state;
    //globalStates[pubkey].pubKey = pubkey;
    var scrubbed = scrubFunc != null ? scrubFunc(state) : state;
    sio.ipfsAddJson(scrubbed, function (address){
        if (publishImmediately){
            sio.ipfsPublish(address, state.keyName, pubkey);//TODO you probably don't always want to publish here, since you'd always just immediately add a post to the thread anyway
            sio.saveObject('states/' + pubkey, state);
        }
        
        if (callback) {
            callback(pubkey);
        }
    });
}

function addNewState(state, globalStates, useKeyFile, publishImmediately, scrubFunc, callback){
    if (useKeyFile){
        let keyName = 'smug-' + Math.random().toString(36).substring(2);
        sio.genKey(keyName, (pubkey) => {
            state.keyName = keyName;
            addGlobally(pubkey, state, globalStates, publishImmediately, scrubFunc, callback);
        });
    } else {
        addGlobally(null, state, globalStates, publishImmediately, scrubFunc, callback);//deprecated
    }
}

function parseSettingToArr(obj){
    let arr = [];
    if (obj != null && obj.constructor != null){
        if (obj.constructor === Array){
            for (let item of obj){
                if (item != null && item != ''){
                    arr.push(item);
                }
            }
        } else if (obj != ''){
            arr.push(obj);
        }
    } else {
        console.log('somehow got here');
        console.log(obj);
    }
    
    return arr;
}

function createSettings(settings, callback){
    let keyName = 'smug-' + Math.random().toString(36).substring(2);
    sio.genKey(keyName, function (pubkey){
        settings.keyName = keyName;
        settings.pubkey = pubkey;
        saveSettings(settings);
        if (callback) {
            callback(pubkey);
        }
    });
}

function saveSettings(settings, callback){
    let publicSettings = JSON.parse(JSON.stringify(settings));
    delete publicSettings.pubkey;
    delete publicSettings.keyName;
    delete publicSettings.lastAddress;
    sio.ipfsAddJson(publicSettings, function(settingsAddress){
        settings.lastAddress = settingsAddress;
        sio.saveObjectAsync('settings/' + settings.pubkey + '.json', settings);
        sio.ipfsPublish(settingsAddress, settings.keyName, settings.pubkey);
        if (callback) {
            callback(settings);
        }
    });
}

function republishAllSettings(){
    var settings = {};
    sio.loadAll(settings, 'settings', function(){
        //sio.ipfsPublishAll(settings);
    });
}

function republishAllStates(states, directory, server, scrubFunc){//TODO read sLogs
    sio.loadAll(states, directory, function(){
        for (let item in states){
            if (states.hasOwnProperty(item)){
                states[item].server = server;
                addItemToState(null, item, states[item], scrubFunc);
            }
        }
    });
}

function publishWithServer(states, server, scrubFunc){
    for (let item in states){
        //console.log(item);
        if (states.hasOwnProperty(item)){
            states[item].server = server;
            //console.log('now trying to add:'); console.log(item);
            addItemToState(null, null, item, states[item], scrubFunc);
        }
    }
}

module.exports.addItemToState = addItemToState;
module.exports.addGlobally = addGlobally;
module.exports.addNewState = addNewState;
module.exports.parseSettingToArr = parseSettingToArr;
module.exports.createSettings = createSettings;
module.exports.saveSettings = saveSettings;
module.exports.republishAllSettings = republishAllSettings;
module.exports.publishWithServer = publishWithServer;

