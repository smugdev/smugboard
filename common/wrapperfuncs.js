var sio = require('./sio.js');
var slog = require('./slog.js');
var util = require('./util.js');
var payloads = require('./payloads.js');

function getBlankWrapper(keyName){
    return {seqno: 0, name: keyName, last: {data: {info: {}, head: null}}};
}

function fillWrapper(wrapper, msg, serverAddress){
    wrapper.last.data.info.mode = msg.mode;
    wrapper.password = msg.password;
    
    if (msg.title && msg.mode !== 'thread') {
        wrapper.last.data.info.title = msg.title;
    }
    if (msg.formats) {
        wrapper.last.data.info.formats = Object.prototype.toString.call(msg.formats) === '[object Array]' ? msg.formats : [msg.formats];
    }
    if (msg.mods) {
        wrapper.last.data.info.mods = Object.prototype.toString.call(msg.mods) === '[object Array]' ? msg.mods : [msg.mods];
    }
    if (msg.threadservers) {
        wrapper.last.data.info.threadservers = Object.prototype.toString.call(msg.threadservers) === '[object Array]' ? msg.threadservers : [msg.threadservers];
    }
    if (msg.server){
        wrapper.last.data.info.server = msg.server;
    } else if (serverAddress){
        wrapper.last.data.info.serverconn = {ip: serverAddress};
    }
    
}

function loadWrapper(wrapper){
    return new Promise((resolve, reject) => {
        slog.getSLogObj(wrapper.last).then((result) => {
            wrapper.last = result;
            if (wrapper.last.data.head == null){
                return null;
            } else {//if (wrapper.sLog == null){
                return slog.updateSLog(wrapper.sLog, wrapper.last.data.head, -1);
            }// else {
            //    return wrapper.sLog;
            //}
        }).then(sLog => {
            wrapper.sLog = sLog;
            if (wrapper.seqno == null && wrapper.sLog != null) {
                wrapper.seqno = slog.getLatestSeqno(wrapper.sLog);
            }
            resolve(wrapper);
        }).catch(reject);
    });
}

//TODO think about merging this into loadWrapper
function pullWrapperStub(wrapperId, wrappers){
    return sio.resolveName(wrapperId).then(address => {
        if (wrappers[wrapperId] == null) {
            wrappers[wrapperId] = {last: {}};
        }
        wrappers[wrapperId].last.data = null;
        wrappers[wrapperId].last.address = address;
        return slog.getSLogObj(wrappers[wrapperId].last);
    });
}

function getServerConn(serverId, wrappers){
    //return new Promise((resolve, reject) => {
    let promise = null;
    if (wrappers[serverId] == null){
        promise = pullWrapperStub(serverId, wrappers);
    }
    return Promise.resolve(promise).then(() => {
        if (!util.propertyExists(wrappers[serverId], 'last.data.info.serverconn') || !wrappers[serverId].last.data.info.mode === 'server') {
            if (util.propertyExists(wrappers[serverId], 'last.data.info.server')){
                return getServerConn(wrappers[serverId].last.data.info.server, wrappers);
            } else {
                return Promise.reject('Not a valid server object.');
            }
        } else {
            return wrappers[serverId].last.data.info.serverconn;
        }
    });
    //});
}

function collectMods(mods, wrappers){
    let modsPending = [];
    if (mods != null){
        for (let mod of mods){
            modsPending.push(
                pullWrapperStub(mod, wrappers).then(() => {
                    return loadWrapper(wrappers[mod]);
                }).then(() => {
                    return slog.calculateSLogPayloads(wrappers[mod]);
                })
            );
        }
    }
    return modsPending;
}

function createObj(msg, wrappers, serverAddress){
    return new Promise((resolve, reject) => {
        let keyName = 'smug-' + Math.random().toString(36).substring(2);
        let newWrapper = getBlankWrapper(keyName);
        fillWrapper(newWrapper, msg, serverAddress);
        newWrapper.name = keyName;
        
        var key;
        sio.genKey(keyName).then(newKey => {
            key = '/ipns/' + newKey.Id;
            wrappers[key] = newWrapper;
            return sio.ipfsAddObject(newWrapper.last.data);
        }).then(newAddress => {
            wrappers[key].last.address = newAddress;
            return sio.ipfsPublish(wrappers[key].last.address, wrappers[key].name, key);
        }).then(() => {
            resolve({result: key});
        }).catch((err) => {
            reject({status: 500, result: err});
        });
    });
}

function addToObj(msg, wrappers, filesInfo, formats, previewable){
    return new Promise((resolve, reject) => {
        if (msg.id == null || msg.id === '' || wrappers[msg.id] == null){
            reject({status: 404, result: 'No object with that id found: ' + msg.id});
            
            //TODO verify that the selected wrapper actually uses the mode in question
            //wrappers[id].last.data.mode
        } else {
            let getPayload;
            switch(msg.mode){
            case 'thread':
                getPayload = payloads.getThreadPayload(msg, filesInfo, formats, previewable); 
                break;
            case 'board':
                getPayload = payloads.getBoardPayload(msg);
                break;
            case 'site':
                getPayload = payloads.getSitePayload(msg);
                break;
            case 'mod':
                getPayload = payloads.getModPayload(msg);
                break;
            default:
                reject({status: 500, result: 'Unsupported operation.'});
            }
            
            let newEntry;
            let releaser;
            //let seqno;
            getPayload.then(payload => {
                newEntry = slog.newSLogEntry('add');
                newEntry.payload = payload;
                return util.acquireLock(wrappers[msg.id]);
            }).then(releaseLock => {
                releaser = releaseLock;
                return loadWrapper(wrappers[msg.id]);
            }).then(() => {
                newEntry.seqno = ++wrappers[msg.id].seqno;
                if (wrappers[msg.id].last.data.head) {
                    newEntry.next = {address: wrappers[msg.id].last.data.head.address};
                }
                return sio.ipfsAddObject(newEntry);
            }).then(newEntryAddress => {
                if (wrappers[msg.id].last.data.info.mode === 'thread' && wrappers[msg.id].last.data.info.op == null){
                    wrappers[msg.id].last.data.info.op = {address: newEntryAddress};
                }
                wrappers[msg.id].last.data.head = {address: newEntryAddress};
                return sio.ipfsAddObject(wrappers[msg.id].last.data);
            }).then(newAddress => {
                wrappers[msg.id].last.address = newAddress;
                //seqno = wrappers[msg.id].seqno;
                releaser();
                releaser = null;
                return sio.ipfsPublish(wrappers[msg.id].last.address, wrappers[msg.id].name, msg.id);
            }).then(() => {
                resolve({result: '' + wrappers[msg.id].seqno});
            }).catch(err => {
                if (releaser) {
                    releaser();
                }
                reject({status: 500, result: err});
            });
            
        }
    });
}

function removeFromObj(msg, wrappers){
    return new Promise((resolve, reject) => {
        if (msg.id == null || msg.id === '' || wrappers[msg.id] == null){
            reject({status: 404, result: 'No object with that id found: ' + msg.id});
            
            //TODO verify that the selected wrapper actually uses the mode in question
            //wrappers[id].last.data.mode
            //or perhaps don't need to bother here?
        } else {
            let newEntry;
            let releaser;
            
            util.acquireLock(wrappers[msg.id]).then(releaseLock => {
                releaser = releaseLock;
                return loadWrapper(wrappers[msg.id]);
            }).then(() => {
                newEntry = slog.newSLogEntry('remove');
                newEntry.target = msg.target;
                if (wrappers[msg.id].last.data.head) {
                    newEntry.next = {address: wrappers[msg.id].last.data.head.address};
                }
                return sio.ipfsAddObject(newEntry);
            }).then(newEntryAddress => {
                wrappers[msg.id].last.data.head = {address: newEntryAddress};
                return sio.ipfsAddObject(wrappers[msg.id].last.data);
            }).then(newAddress => {
                wrappers[msg.id].last.address = newAddress;
                releaser();
                releaser = null;
                return sio.ipfsPublish(wrappers[msg.id].last.address, wrappers[msg.id].name, msg.id);
            }).then(() => {
                resolve({result: 'Removal successful.'});
            }).catch(err => {
                if (releaser) {
                    releaser();
                }
                reject({status: 500, result: err});
            });
        }
    });
}

function setObj(msg, wrappers, serverAddress){//TODO
    return new Promise((resolve, reject) => {
        if (msg.id == null || msg.id === '' || wrappers[msg.id] == null){
            reject({status: 404, result: 'No object with that id found: ' + msg.id});
            
            //TODO verify that the selected wrapper actually uses the mode in question
            //wrappers[id].last.data.mode
        } else {
            //if msg.lastdata 
            //JSON.parse(msg.lastdata)
            //wrappers[msg.id].last = {data: msg.lastdata}
            //recalculate wrappers[msg.id].last.address
            //publish wrappers[msg.id].last.address to wrappers[msg.id].name (msg.id)
            //wrappers[msg.id].seqno = null
            //wrappers[msg.id].sLog = null
        }
    });
}
            
function deleteObj(msg, wrappers){
    return new Promise((resolve, reject) => {
        if (msg.id == null || msg.id === '' || wrappers[msg.id] == null){
            reject({status: 404, result: 'No object with that id found: ' + msg.id});
        } else {
            wrappers[msg.id] = null; //well that was easy
            resolve({result: msg.id + ' deleted.'});
            //TODO consider purging all object content from ipfs... but need to think about what if some content appears in multiple wrappers
        }
    });
}

module.exports.loadWrapper = loadWrapper;
module.exports.pullWrapperStub = pullWrapperStub;
module.exports.getServerConn = getServerConn;
module.exports.collectMods = collectMods;
module.exports.createObj = createObj;
module.exports.addToObj = addToObj;
module.exports.removeFromObj = removeFromObj;
module.exports.setObj = setObj;
module.exports.deleteObj = deleteObj;

