var sio = require('./sio.js');

function sLogTimestamp(){
    return Date.now();
}

function hashFromAddress(address){
    var hash = address.split('/');
    for (let i = 0; i < hash.length; i++){
        if (hash[i] == 'ipfs' || hash[i] == 'ipns'){
            return hash[i+1];
        }
    }
    return hash[hash.length - 1];
}

function lastItemFromAddress(address){
    var hash = address.split('/');
    return hash[hash.length - 1];
}

function ensureHashIpfs(hash){
    var itemSplit = hash.split('/');
    if (itemSplit.length < 3) {
        return '/ipfs/' + hash;
    } else {
        return hash;
    }
}

function ensureHashIpns(hash){
    var itemSplit = hash.split('/');
    if (itemSplit.length < 3) {
        return '/ipns/' + hash;
    } else {
        return hash;
    }
}

function ensureAllHashesIpns(arr){
    let i;
    for (i = 0; i < arr.length; i++){
        arr[i] = ensureHashIpns(arr[i]);
        /*var itemSplit = arr[i].split("/");
            if (itemSplit.length < 3)
                arr[i] = '/ipns/' + arr[i];*/
    }
    return arr;
}

function newSLogEntry(next, payload){
    return {
        next: null,
        payload: null, //will normally consist of { operation: xxxx, data: yyyy }
        timestamp: sLogTimestamp()
    };
}

function calculateSLogPayloads(sLog){
    //given an array of slog entries, calculate the active items (i.e. subtracting deleted stuff)
    var result = [];
    var removals = [];
    for (let item of sLog){
        if (item.payload != null){
            //item.payload.data.seqNo = null;//TODO seqNo shouldn't even be in the payload
            if (item.payload.operation == 'add'){
                result.push({
                    data: item.payload.data,
                    timestamp: item.payload.timestamp,
                    seqNo: item.payload.seqNo
                });
            } else if (item.payload.operation == 'remove'){
                //entries are identified by data + timestamp
                removals.push({
                    data: item.payload.data,
                    timestamp: item.payload.timestamp,
                    seqNo: item.payload.seqNo
                });
            } else if (item.payload.operation == 'keyframe'){
                for (let keyitem of item.payload.data){
                    result.push({
                        data: keyitem.data,
                        timestamp: keyitem.timestamp,
                        seqNo: keyitem.seqNo
                    });
                }
            }
        }
    }
    for (let item of removals){
        for (let i = 0; i < result.length; i++){
            //TODO this is probably unnecessarily slow, might need a rework at some point
            let deleteThis = true;
            
            for (let key in item){
                if (!item.hasOwnProperty(key)) {
                    continue;
                } else if (item[key] != result[i][key]) {
                    deleteThis = false;
                }
            }
            
            if (deleteThis){//result[i].data == item.data){// && (result[i].timestamp == item.timestamp || item.timestamp == null)){
                //assumes there is only one of any given data + timestamp combo - null timestamp will check everything//not any more. i dunno, this is confusing
                result.splice(i, 1);
                //if (item.timestamp == null)
                //    i--;
                //else
                break;
            }
        }
    }
    return result;
}

function calculateDeletionSLogPayloads(thread, payloads, deletionPayloads){    
    var newPayloads = [];
    
    var i, j, flagged = [];
    
    for (i = 0; i < payloads.length; i++){
        flagged[i] = false;
        for (j = 0; j < deletionPayloads.length; j++) {
            if (payloads[i].seqNo == deletionPayloads[j].data.postNo && thread == deletionPayloads[j].data.thread) {
                flagged[i] = true;
            }
        }
    }
    
    for (i = 0; i < payloads.length; i++){
        if (flagged[i] == null) {
            console.log('Logic errror.');
        } else if (!flagged[i]) {
            newPayloads.push(payloads[i]);
        }
    }
    
    return newPayloads;
}

function calculateFlagSLogPayloads(thread, payloads, flagPayloads){
    var i, j, flagged = [];
    
    for (i = 0; i < payloads.length; i++){
        flagged[i] = false;
        for (j = 0; j < flagPayloads.length; j++) {
            if (payloads[i].seqNo == flagPayloads[j].data.postNo && thread == flagPayloads[j].data.thread) {
                flagged[i] = true;
            }
        }
    }
    
    for (i = 0; i < payloads.length; i++){
        if (flagged[i] == null) {
            console.log('Logic errror.');
        }
        payloads[i].flagged = flagged[i];
    }
    return payloads;
}

//note: gateway can (and should) be null if running as client
function recursiveLoad(runningSLog, sLogLastGoodNext, insertAfter, depth, onCompletion, onEntry){//TODO gateway is deprecated
    return function(jsonObj){
        var sLogEntry = JSON.parse(jsonObj);
        
        if (runningSLog == null) {
            runningSLog = [];
        }
        if (sLogLastGoodNext == sLogEntry.next){
            //we know that if we see the same next value, we've already seen this node since this is an append-only linked list built on a merkel-dag
            if (onCompletion != null) {
                onCompletion(runningSLog);
            }
        } else {
        
            if (insertAfter == -1){
                runningSLog.unshift(sLogEntry);
            } else if (runningSLog.length == insertAfter + 1){
                runningSLog.push(sLogEntry);
            } else {
                runningSLog.splice(insertAfter + 1, 0, sLogEntry);
            }

            if (onEntry != null) {
                onEntry(sLogEntry);
            }
            
            //recurse until we hit the list tail or we hit a recursion depth limit
            if (sLogEntry.next != null && (depth == -1 || depth > 0)){
                sio.getJsonObjFromAPI(sLogEntry.next, recursiveLoad(runningSLog, sLogLastGoodNext, insertAfter, depth == -1 ? depth : --depth, onCompletion, onEntry));
            } else {
                if (onCompletion != null) {
                    onCompletion(runningSLog);
                }
            }
        }
    };
}

function updateSLog(sLog, sLogAddress, depth, onCompletion, onEntry){
    var sLogLastGood;
    var insertAfter;
    if (sLog == null){
        sLogLastGood = 'default';
        insertAfter = -1;
    } else {
        sLogLastGood = sLog[sLog.length - 1].next;
        insertAfter = sLog.length - 1;
    }
        
    sio.getJsonObjFromAPI(sLogAddress, recursiveLoad(sLog, sLogLastGood, insertAfter, depth, onCompletion, onEntry));
}

function getSLog(sLogAddress, depth, gateway, onCompletion, onEntry){//TODO gateway is deprecated
    updateSLog(null, sLogAddress, depth, onCompletion, onEntry);
}

function constructPayload(operationIn, dataIn, seqNo){
    return {
        operation: operationIn,
        data: dataIn,
        seqNo: seqNo,
        timestamp: sLogTimestamp()//TODO timestamp should be a part of the data//or... not?
    };
}

function addToSLog(lastAddress, newEntry, callback){
    newEntry.timestamp = sLogTimestamp();
    newEntry.next = lastAddress;
    sio.ipfsAddJson(newEntry, callback);
    //var newEntryAddress = sio.ipfsAddSync(newEntry);//TODO
    //callback(newEntryAddress);
}

module.exports.sLogTimestamp = sLogTimestamp;
module.exports.hashFromAddress = hashFromAddress;
module.exports.lastItemFromAddress = lastItemFromAddress;
module.exports.ensureHashIpns = ensureHashIpns;
module.exports.ensureHashIpfs = ensureHashIpfs;
module.exports.ensureAllHashesIpns = ensureAllHashesIpns;
module.exports.newSLogEntry = newSLogEntry;
module.exports.calculateSLogPayloads = calculateSLogPayloads;
module.exports.calculateDeletionSLogPayloads = calculateDeletionSLogPayloads;
module.exports.calculateFlagSLogPayloads = calculateFlagSLogPayloads;
module.exports.updateSLog = updateSLog;
module.exports.getSLog = getSLog;
module.exports.constructPayload = constructPayload;
module.exports.addToSLog = addToSLog;

