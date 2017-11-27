function propertyExists(obj, prop) {
    var parts = prop.split('.');
    for(var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        if(obj !== null && typeof obj === 'object' && part in obj) {
            obj = obj[part];
        } else {
            return false;
        }
    }
    return true;
}

function hashFromAddress(address){
    var hash = address.split('/');
    for (let i = 0; i < hash.length; i++){
        if (hash[i] === 'ipfs' || hash[i] === 'ipns'){
            return hash[i+1];
        }
    }
    return hash[hash.length - 1];
}

function rebuildKeys(rawKeys, daemonKeys){
    for (let keyId of Object.keys(rawKeys)){
        rawKeys[keyId].last = {address: rawKeys[keyId].last};
    }
    for (let key of daemonKeys.Keys){
        if (rawKeys['/ipns/' + key.Id] != null){
            rawKeys['/ipns/' + key.Id].name = key.Name;
        }
    }
    return rawKeys;
}

function prepareStorageKeys(rawKeys){
    var storageKeys = {};
    for (let keyId of Object.keys(rawKeys)){
        storageKeys[keyId] = {last: rawKeys[keyId].last.address, password: rawKeys[keyId].password};
    }
    return storageKeys;
}

function processQueue(obj, myFunc){
    
    if (!obj.funcQueue) {
        obj.funcQueue = [];
    }
    
    //myFunc must take (callback)
    if (myFunc) {
        obj.funcQueue.push({func: myFunc, running: false});
    }
        
    let somethingRunning = false;
    for (let item of obj.funcQueue) {
        if (item.running === true) {
            somethingRunning = true;
        }
    }
    
    if (!somethingRunning && obj.funcQueue.length > 0){
        obj.funcQueue[0].running = true;
        obj.funcQueue[0].func(() => {
            obj.funcQueue.shift();
            processQueue(obj);
        });
    }
}

function acquireLock(obj){
    return new Promise((resolve, reject) => {
        processQueue(obj, (releaseLock) => {
            resolve(releaseLock);
        });
    });
}

module.exports.propertyExists = propertyExists;
module.exports.hashFromAddress = hashFromAddress;
module.exports.rebuildKeys = rebuildKeys;
module.exports.prepareStorageKeys = prepareStorageKeys;
//module.exports.processQueue = processQueue;
module.exports.acquireLock = acquireLock;
