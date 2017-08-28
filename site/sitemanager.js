var sio = require('../common/sio.js');
var slog = require('../common/slog.js');
var util = require('../common/util.js');

//var imgDims = require('image-size');
var express = require('express');
var app = express();
var multer  = require('multer');
var upload = multer();

var serverAddress = require('../common/settings.js').getAddress();// sio.loadObject('../common/settings.json').serverAddress;
var port = 3003; //0 makes the program just pick something free

var serverInfoGlobal = {
    server: null,
    useKeyFile: true,
};

var globalStates = {};

var globalBindings = {'smugch.an': 'QmLocalIPFSNode'}; //for telling the server that some domain name corresponds to some ipns address

var reservedNames = ['ipns', 'ipfs', 'dns', 'api'];

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

function newEntry(payloadIn, serverInfo){
    return {
        title: serverInfo.title,
        payload: payloadIn,
        server: serverInfo.server,
        mode: serverInfo.mode,
        settings: serverInfo.settings
        //pubkey: serverInfo.pubkey
    };
}

function admin(postRaw, res){
    if (postRaw.operation == 'new'){
        var settings = {
            mods: slog.ensureAllHashesIpns(util.parseSettingToArr(postRaw.mods)),
            title: postRaw.title,
            banners: slog.ensureAllHashesIpns(util.parseSettingToArr(postRaw.banners))
        };
        
        console.log(settings);
        
        /*util.createSettings(settings, function(settingsPubkey){
            var board = {
//                title: postRaw.title,
                lastAddress: null,
                lastSeqNo: 0,
                mode: "index",
                settings: '/ipns/' + settingsPubkey,
                server: serverInfoGlobal.server,
                keyFile: null
            };
            
            util.addNewState(board, globalStates, globalSLogs, true, true, blankEntry, function(pubkey){
                res.send('/ipns/' + pubkey);
            });
        });*/
        
        util.createSettings(settings, function(settingsPubkey){
            var site = {
                lastAddress: null,
                lastSeqNo: 0,
                mode: 'site',
                settings: '/ipns/' + settingsPubkey,
                server: serverInfoGlobal.server
            };
            
            util.addNewState(site, globalStates, true, true, blankEntry, function(pubkey){
                res.send('/ipns/' + pubkey);
            });
        });
    } else if (postRaw.operation == 'delete'){//TODO test this stuff
        //should be refactored to share this stuff with the other servers
        //var payload = slog.constructPayload('delete', {uri: postRaw.uri, address: postRaw.address}, postRaw.seqNo);
        payload.timestamp = postRaw.timestamp;
        let siteHash = slog.hashFromAddress(postRaw.site);
        util.addItemToState('delete', {uri: postRaw.uri, address: postRaw.address}, siteHash, globalStates[siteHash], blankEntry);//TODO pretty sure operation is supposed to be 'remove'
        res.send('Board deletion successful');
    }
}

function handleInput(postRaw, res){
    if (postRaw.admin == 'true'){
        admin(postRaw, res);
    } else if (postRaw.uri != null && postRaw.address != null && postRaw.site != null &&
        postRaw.uri != '' && postRaw.address != '' && postRaw.site != ''){
        //console.error(postRaw.address);
        var address = '/ipns/' + slog.hashFromAddress(postRaw.address); //TODO validate this, also validate the uri //TODO function should go the other way, verify the address starts with /ipfs OR /ipns (maybe we want static boards)
        //console.error(address);
        var site = slog.hashFromAddress(postRaw.site);
        console.log(site);
        if (globalBindings[site] != null) {
            site = globalBindings[site];
        }
        console.log(globalBindings[site]);
        if (reservedNames.indexOf(postRaw.uri) > -1){
            res.status(409).send('Name is reserved');
        } else if (globalStates[site] == null){
            res.status(400).send('Tried to add index to non-existent site');
        } else {
            //var payload = slog.constructPayload('add', {uri: postRaw.uri, address: address}, ++globalStates[site].lastSeqNo);
            //console.log('payload is:')
            //console.log(payload)
            util.addItemToState('add', {uri: postRaw.uri, address: address}, site, globalStates[site], blankEntry);
            res.send('Post successful');
        }
    } else {
        res.status(400).send('Malformed POST');
    }
}

app.post('/', upload.fields([]), function (req, res, next) {//TODO get rid of file uploads
    console.log('data received: ' + JSON.stringify(req.body));
    //console.log(req.header('x-forwarded-for'))
    //console.log(req.headers['x-forwarded-for'])
    //console.log(req.connection.remoteAddress);
    res.set('Access-Control-Allow-Origin', '*');
    if (req.body != null) {
        handleInput(req.body, res);
    }
});

function setupServer(){
    /*sio.loadAll(globalStates, 'states', function(){
        sio.ipfsPublishAll(globalStates);
    });*/

    serverInfoGlobal.server = serverAddress + ':' + listener.address().port;
    
    sio.loadAll(globalStates, 'states', function(){
        //util.publishWithServer(globalStates, serverInfoGlobal.server, blankEntry);
    });
    
    util.republishAllSettings();
    /*    var site = {
        title: "Smugchan",
        lastAddress: null,
        lastSeqNo: 0,
        mode: "site",
        settings: null,//TODO
        server: serverInfoGlobal.server,
        keyFile: null
    };
    
    util.addNewState(site, globalStates, globalSLogs, serverInfoGlobal.useKeyFile, true, blankEntry);*/
    
    console.log('Now listening on ' + serverInfoGlobal.server);
}

var listener = app.listen(port, function(){
    setupServer();
});

