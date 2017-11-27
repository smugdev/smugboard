var sio = require('./sio.js');
var storage = require('./storage.js');
var util = require('./util.js');
var wrapper = require('./wrapperfuncs.js');

var globalWrappers = {};
var serverModes = ['site', 'board', 'thread', 'mod', 'server'];

var formats =  ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webm', 'mp4', 'mp3', 'ogg', 'opus', 'flac', 'apng', 'pdf', 'iso', 'zip', 'tar', 'gz', 'rar', '7z', 'torrent'];
var previewable = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico'];//things image-size can deal with

function isValidRequest(mode, type, password, key, wrappers){
    let requestValid = false;
    let authorized = false;
    if (key != null && wrappers[key] != null && wrappers[key].password === password) {
        authorized = true;
    }
    
    //authorized = true; //TODO remove this, for test purposes only
    
    if (mode == null || type == null || serverModes.indexOf(mode) === -1){
        return false;
    } else if (type === 'create') {
        requestValid = true;
    } else if (type === 'add' && (mode !== 'mod' || authorized)) {
        requestValid = true;
    } else if (type === 'remove' && authorized) {
        requestValid = true;
    } else if (type === 'set' && authorized) {
        requestValid = true;
    } else if (type === 'delete' && authorized) {
        requestValid = true;
    }
    
    return requestValid;
}

//handler (generic)
function handleInput(msg, files, sender, serverAddress){
    return new Promise((resolve, reject) => {
        if (isValidRequest(msg.mode, msg.type, msg.password, msg.id, globalWrappers)){
            let wrapperOperation;
            switch(msg.type){
            case 'create':
                wrapperOperation = wrapper.createObj(msg, globalWrappers, serverAddress);
                break;
            case 'add':
                wrapperOperation = wrapper.addToObj(msg, globalWrappers, files, formats, previewable);
                break;
            case 'remove':
                wrapperOperation = wrapper.removeFromObj(msg, globalWrappers);
                break;
            case 'set':
                wrapperOperation = wrapper.setObj(msg, globalWrappers, serverAddress);
                break;
            case 'delete':
                wrapperOperation = wrapper.deleteObj(msg, globalWrappers);
            }
            
            wrapperOperation.then(resp => {
                storage.saveWrappers(util.prepareStorageKeys(globalWrappers)); //TODO put this somewhere else
                resolve(resp);
            }).catch(reject);
        } else {
            reject({status: 400, result: 'Invalid request or password.'});
        }
    });
}

function setupServer(){
    return Promise.all([storage.getWrappers(), sio.getKeys()]).then((values) => {
        globalWrappers = util.rebuildKeys(values[0], values[1]);
        
        /*console.log('Test point A');
        console.log(globalWrappers);
        let board;
        handleInput({mode: 'board', type: 'create', password: 'fugg', title: 'My Shitpoos', formats: ['png', 'jpg'], mods: []}, [null], 'hurr', 'http://localhost').then(obj => {
            console.log('Test point B');
            console.log(obj);
            board = obj.result;
            console.log(globalWrappers);
            return handleInput({mode: 'thread', type: 'create', password: 'fugg', title: 'My Shitthread'}, [null], 'hurr', 'http://localhost');
        }).then(obj => {
            console.log('Test point C');
            console.log(obj);
            console.log(globalWrappers);
            return handleInput({mode: 'board', type: 'add', id: board, password: 'fugg', newaddress: obj.result}, [null], 'hurr', 'http://localhost');
        }).then(obj => {
            console.log('Test point D');
            console.log(obj);
            console.log(globalWrappers);
            return handleInput({mode: 'board', type: 'add', id: board, password: 'fugg', newaddress: obj.result}, [null], 'hurr', 'http://localhost');
        }).then(obj => {
            console.log('Test point E');
            console.log(obj);
            console.log(globalWrappers);
            return handleInput({mode: 'board', type: 'add', id: board, password: 'fugg', newaddress: obj.result}, [null], 'hurr', 'http://localhost');
        }).then(obj => {
            console.log('Test point F');
            console.log(obj);
            console.log(globalWrappers);
        }).catch(console.error);*/
        
        /*var server;
        var mod;
        var site;
        var board;
        var thread;
        var post3;
        handleInput({mode: 'server', type: 'create', password: 'fugg', title: 'Server-chan'}, [null], 'hurr', 'http://localhost:3010').then(obj => {
            server = obj.result;
            console.log('Server: ' + server);
            return handleInput({mode: 'mod', type: 'create', password: 'fugg', title: 'Pockets the Mod', server: server}, [null], 'hurr');
        }).then(obj => {
            mod = obj.result;
            console.log('Mod: ' + mod);
            return handleInput({mode: 'site', type: 'create', password: 'fugg', title: 'Smugchan NEXT', formats: ['png', 'jpg'], mods: [mod], server: server}, [null], 'hurr');
        }).then(obj => {
            site = obj.result;
            console.log('Site: ' + site);
            return handleInput({mode: 'thread', type: 'create', password: 'fugg', title: 'My Shitthread', server: server}, [null], 'hurr');
        }).then(obj => {
            thread = obj.result;
            console.log('Thread: ' + thread);
            return handleInput({mode: 'board', type: 'create', password: 'fugg', title: 'Random', formats: ['png', 'jpg'], mods: [mod], threadservers: [server], server: server}, [null], 'hurr');
        }).then(obj => {
            board = obj.result;
            console.log('Board: ' + board);
            return handleInput({mode: 'site', type: 'add', id: site, password: 'fugg', newaddress: board, uri: 'b'}, [null], 'hurr');
        }).then(obj => {
            console.log('Board added to site at: ' + obj.result);
            return handleInput({mode: 'board', type: 'add', id: board, password: 'fugg', newaddress: thread}, [null], 'hurr');
        }).then(obj => {
            console.log('Thread added to board at: ' + obj.result);
            return handleInput({mode: 'thread', type: 'add', id: thread, password: 'fugg', author: 'Anonymous', email: 'sage', body: 'Babbies first shitpoast'}, [null], 'hurr');
        }).then(obj => {
            console.log('Post added to thread at: ' + obj.result);
            return handleInput({mode: 'thread', type: 'add', id: thread, password: 'fugg', author: 'Anonymous', body: 'Babbies second shitpoast'}, [null], 'hurr');
        }).then(obj => {
            console.log('Post added to thread at: ' + obj.result);
            return handleInput({mode: 'thread', type: 'add', id: thread, password: 'fugg', author: 'Anonymous', body: 'Babbies 3rd shitpoast'}, [null], 'hurr');
        }).then(obj => {
            console.log('Post added to thread at: ' + obj.result);
            return handleInput({mode: 'thread', type: 'add', id: thread, password: 'fugg', author: 'Anonymous', body: 'Babbies 4th shitpoast'}, [null], 'hurr');
        }).then(obj => {
            console.log('Post added to thread at: ' + obj.result);
            //return handleInput({mode: 'mod', type: 'add', id: mod, password: 'fugg', operation: 'remove', target: '/ipfs/Qmaddress'}, [null], 'hurr');
        }).catch(console.error);*/
        
        
        return;
    });
}

module.exports.handleInput = handleInput;
module.exports.setupServer = setupServer;

