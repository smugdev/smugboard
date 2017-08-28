var sio = require('../common/sio.js');
var slog = require('../common/slog.js');
var util = require('../common/util.js');

//var imgDims = require('image-size');
var cors = require('cors');
var express = require('express');
var app = express();
var multer  = require('multer');
var upload = multer();

app.use(cors());

var serverAddress = require('../common/settings.js').getAddress();//sio.loadObject('../common/settings.json').serverAddress;
var port = 3001; //0 makes the program just pick something free

var serverInfoGlobal = {
    settings: null,
    server: null,
    useKeyFile: true,
};

var globalStates = {};

function newEntry(payloadIn, serverInfo){
    return {
        title: serverInfo.title,
        payload: payloadIn,
        server: serverInfo.server,
        mode: serverInfo.mode,
        settings: serverInfo.settings
        //pubkey: serverInfo.pubkey
    };
}//TODO this and the below function are obv. redundant, same for the other servers

function blankEntry(info, payload){
    //this is the default stuff you want to actually go out to the user
    //don't put your private key here, for instance
    var entry = {
        title: info.title,
        server: info.server,
        mode: info.mode,
        settings: info.settings
    };
    if (payload) {
        entry.payload = payload;
    }
    return entry;
}

function parseSettings(postRaw){
    let mods = slog.ensureAllHashesIpns(util.parseSettingToArr(postRaw.mods));
    let banners = slog.ensureAllHashesIpns(util.parseSettingToArr(postRaw.banners));
    let fileFormats = util.parseSettingToArr(postRaw.fileFormats);
    let threadServers = slog.ensureAllHashesIpns(util.parseSettingToArr(postRaw.threadServers));

    return {
        mods: mods,
        title: postRaw.title, // /thisstuff/ comes from the naming system above
        banners: banners,
        fileFormats: fileFormats,
        threadServers: threadServers
    };
}

function admin(postRaw, res){
    if (postRaw.operation == 'new'){
        var settings = parseSettings(postRaw);
        console.log(settings);
        
        util.createSettings(settings, function(settingsPubkey){
            var board = {
                //                title: postRaw.title,
                lastAddress: null,
                lastSeqNo: 0,
                mode: 'index',
                settings: '/ipns/' + settingsPubkey,
                server: serverInfoGlobal.server
            };
            console.log('settings: ' + board.settings);
            util.addNewState(board, globalStates, true, true, blankEntry, function(pubkey){
                res.send('/ipns/' + pubkey);
            });
        });
        
        /*sio.ipfsAdd(settings, function(settingsAddress){
            var board = {
//                title: postRaw.title,
                lastAddress: null,
                lastSeqNo: 0,
                mode: "index",
                settings: settingsAddress,
                server: serverInfoGlobal.server,
                keyFile: null
            };
            
            util.addNewState(board, globalStates, globalSLogs, true, true, blankEntry, function(pubkey){
                res.send('/ipns/' + pubkey);
            });
        });*/
    }    
}

function selectThreadToPrune(){

}

function pruner(){//TODO
    for (board of Object.keys(globalStates)){
        if (globalStates[board] != null && globalStates[board].pruneQueued == true && globalStates[board].currentlyPruning != true){
            console.log(board);
            console.log(globalStates[board]);
            globalStates[board].pruneQueued = false;
            globalStates[board].currentlyPruning = true;
            
            //get board sLog
            
            //find how many threads there are
            
            //if there's too many, find the latest post in each thread (oh fug) and sort the threads such that the deadest thread is at the top
            
            //prune threads until there's few enough
            
            globalStates[board].currentlyPruning = false;
        }
    }
    
    setTimeout(pruner, 60 * 60 * 1000);
}

function handleInput(postRaw, res){
    if (postRaw.admin == 'true'){
        admin(postRaw, res);
    } else if (postRaw.board != null){
        var board = slog.hashFromAddress(postRaw.board);
        if (globalStates[board] != null && postRaw.thread != null && postRaw.thread != ''){
            //var payload = slog.constructPayload('add', {address: postRaw.thread}, ++globalStates[board].lastSeqNo);
            util.addItemToState('add', {address: postRaw.thread}, board, globalStates[board], blankEntry);
            //console.log('Returning ' + globalStates[board].lastSeqNo + ' to thread server.');
            res.send(globalStates[board].lastSeqNo + '');
        } else {
            res.status(400).send('Malformed POST');//TODO this isn't accurate
        }
    } else {
        res.status(404).send('Malformed POST: Board not found.');
    }
}

app.post('/', upload.fields([]), function (req, res, next) {
    console.log('post received: ' + JSON.stringify(req.body));
    //console.log(req)
    //TODO needs some authentication structure. ideally this would come by the thread server's pubkey matching something in settings.threadServers
    if (req.body != null) {
        handleInput(req.body, res);
    }
});



function setupServer(){
    //serverInfoGlobal.settings = sio.ipfsAddSync(settings);//TODO this should be done in boardmanager.js
    serverInfoGlobal.server = serverAddress + ':' + listener.address().port;
    //sio.ipfsPublish(sio.ipfsAddSync(blankEntry(serverInfoGlobal)), serverInfoGlobal.keyFile);
    
    sio.loadAll(globalStates, 'states', function(){
        //util.publishWithServer(globalStates, serverInfoGlobal.server, blankEntry);
        /*for (let item in globalStates){
            //console.log(item);
            if (globalStates.hasOwnProperty(item)){
                globalStates[item].server = serverInfoGlobal.server;
                //console.log('now trying to add:'); console.log(item);
                util.addItemToState(null, item, globalStates[item], globalSLogs[item], blankEntry)
            }
        }
        //sio.ipfsPublishAll(globalStates);//TODO overwrite the servers*/
    });
    

    //util.republishAllStates(globalStates, 'states', serverInfoGlobal.server, blankEntry);
    
    //util.republishAllSettings();
    
    /*var board = {
        title: "/test/ - My Shitpoos",
        lastAddress: null,
        lastSeqNo: 0,
        mode: "index",
        settings: serverInfoGlobal.settings,
        server: serverInfoGlobal.server,
        keyFile: null
    };
    
    util.addNewState(board, globalStates, globalSLogs, serverInfoGlobal.useKeyFile, true, blankEntry);*/
    
    //createNewBoard(serverInfoGlobal.server, serverInfoGlobal.useKeyFile);
    
    pruner();
    
    console.log('Now listening on ' + serverInfoGlobal.server);
}

var listener = app.listen(port, function(){
    setupServer();
});

