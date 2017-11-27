var sio = require('./sio.js');

function calculateSLogPayloads(sLog){
    let i, j;
    
    for (i = sLog.length - 1; i >= 0; i--){
        if (sLog[i].data.operation === 'remove' && sLog[i].data.target != null && !sLog[i].removed){
            for (j = i - 1; j >= 0; j--){
                if (sLog[j].address === sLog[i].data.target){
                    sLog[j].removed = true;
                    break;
                }
            }
        }
    }
    
    //TODO expand keyframes here
}

function subtractSLog(sLog, deletionSLog){
    let targets = [];
    if (deletionSLog) {
        for (let item of deletionSLog){
            if (!item.removed && item.payload && item.payload.data && item.payload.data.target){//TODO run through getSLogObj
                targets.push(item.payload.data.target);
            }
        }
    }
    
    for (let item of sLog){
        if (targets.indexOf(sLog.address) !== -1){
            item.removed = true;
        }
    }
}

function getLatestSeqno(sLog){
    for (let i = sLog.length - 1; i >= 0; i--){
        if (sLog[i].seqno != null){
            return sLog[i].seqno;
        }
    }
    return 0;
}

//gets data from object, visiting the address if necessary
function getSLogObj(obj){
    return new Promise((resolve, reject) => {
        if (obj.data != null){
            resolve(obj);
        } else if (obj.address == null){
            reject('Malformed object: ' + obj);//obj can have a .address, but can also have a .data for speed. obj.address should point to the exact same JSON object as obj.data if it exists.
        } else {
            sio.getJsonObject(obj.address).then(result => {
                obj.data = result;
                resolve(obj);
            }).catch(reject);
        }
    });
}

function recursiveLoad(runningSLog, sLogLastGoodNext, insertAfter, depth, onCompletion, onFail){
    return function(sLogEntry){
        //sLogEntry.address = objAddress;
        if (runningSLog == null) {
            runningSLog = [];
        }
        if (sLogEntry.data.next != null && sLogEntry.data.next.address != null && sLogLastGoodNext === sLogEntry.data.next.address){
            //we know that if we see the same next value, we've already seen this node since this is an append-only linked list built on a merkel-dag
            if (onCompletion != null) {
                onCompletion(runningSLog);
            }
        } else {
            if (insertAfter === -1){
                runningSLog.unshift(sLogEntry);
            } else if (runningSLog.length === insertAfter + 1){
                runningSLog.push(sLogEntry);
            } else {
                runningSLog.splice(insertAfter + 1, 0, sLogEntry);
            }
            
            //recurse until we hit the list tail or we hit a recursion depth limit
            if (sLogEntry.data.next != null && (depth === -1 || depth > 0)){
                getSLogObj(sLogEntry.data.next).then(recursiveLoad(runningSLog, sLogLastGoodNext, insertAfter, depth === -1 ? depth : --depth, onCompletion, onFail)).catch(onFail);
            } else {
                if (onCompletion != null) {
                    onCompletion(runningSLog);
                }
            }
        }
    };
}

function updateSLog(sLog, sLogAddress, depth){
    return new Promise((resolve, reject) => {
        var sLogLastGood;
        var insertAfter;
        if (sLog == null){
            sLogLastGood = 'default';
            insertAfter = -1;
        } else {
            if (sLog[sLog.length - 1].data.next) {
                sLogLastGood = sLog[sLog.length - 1].data.next.address;
            } else {
                sLogLastGood = 'default';
            }
            insertAfter = sLog.length - 1;
        }
        
        getSLogObj(sLogAddress).then(recursiveLoad(sLog, sLogLastGood, insertAfter, depth, resolve, reject)).catch(reject);
    });
}


function newSLogEntry(operation){
    var result = {
        timestamp: Date.now(),
        next: null,
        operation: operation,
    };
    
    return result;
}

module.exports.calculateSLogPayloads = calculateSLogPayloads;
module.exports.subtractSLog = subtractSLog;
module.exports.getSLogObj = getSLogObj;
module.exports.updateSLog = updateSLog;
module.exports.getLatestSeqno = getLatestSeqno;
module.exports.newSLogEntry = newSLogEntry;

