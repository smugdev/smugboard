var sio = require('../common/sio.js');
var slog = require('../common/slog.js');
var util = require('../common/util.js');
var imgDims = require('image-size');

//var https = require('https');

var express = require('express');
var app = express();
var multer  = require('multer');
//var upload = multer({ dest: '/tmp' });


var storage = multer.memoryStorage();
var upload = multer({ storage: storage });


//var ReadWriteLock = require('rwlock');
//var lock = new ReadWriteLock();

var serverAddress = require('../common/settings.js').getAddress();//sio.loadObject('../common/settings.json').serverAddress;
var port = 3000; //0 makes the program just pick something free

var serverInfoGlobal = {
    settings: null,
    server: null,
    useKeyFile: true,
};

//temp location
var settings = {
    //mods: [],
    //title: "Test", // /thisstuff/ comes from the naming system above
    //banners: [],
    fileFormats: ['jpg', 'png', 'gif'], //TODO if not [], should only approve formats that board and thread servers agree on
    //TODO max file size
};

var globalStates = {};

var boardBindings;

function buildPostJson(postData, fileData){
    var result = {
        author: postData.name != null && postData.name != '' ? postData.name : 'Anonymous',
        email: postData.email,
        subject: postData.subject,
        body: postData.body,
        files: []
    };
    if (fileData.length > 0) {
        for (let file of fileData) {
            result.files.push(file);
        }
    }
    
    if (postData.processedFiles != null){
        let remoteFiles = JSON.parse(postData.processedFiles);
        for (let file of remoteFiles) {
            result.files.push(file);
        }
    }
    
    return result;
}

function newEntry(payloadIn, serverInfo){
    var newThreadEntry = {
        title: serverInfo.title,
        payload: payloadIn,
        server: serverInfo.server,
        mode: serverInfo.mode,
        pubkey: serverInfo.pubkey,
        lastbump: serverInfo.lastbump
    };

    if (serverInfo.op == null){
        newThreadEntry.op = payloadIn;
        //newThreadEntry.op.timestamp = payloadIn.timestamp;
        serverInfo.op = newThreadEntry.op;
    } else {
        newThreadEntry.op = serverInfo.op;
    }
    return newThreadEntry;
}

function blankEntry(serverInfo, payload){
    var newThreadEntry = {
        title: serverInfo.title,
        server: serverInfo.server,
        mode: serverInfo.mode,
        //pubkey: serverInfo.pubkey,
        lastbump: serverInfo.lastbump
    };
    
    if (payload){
        newThreadEntry.payload = payload;
        if (serverInfo.op == null){
            newThreadEntry.op = payload.data;
            newThreadEntry.op.timestamp = payload.timestamp;
            serverInfo.op = newThreadEntry.op;
        } else {
            newThreadEntry.op = serverInfo.op;
        }
    }
    return newThreadEntry;
}

/*function blankEntry(serverInfo){
    var newThreadEntry = {
        title: serverInfo.title,
        server: serverInfo.server,
        mode: serverInfo.mode,
        pubkey: serverInfo.pubkey,
        lastbump: serverInfo.lastbump
    };

    if (serverInfo.op == null){
        newThreadEntry.op = payloadIn.data;
        newThreadEntry.op.timestamp = payloadIn.timestamp;
        serverInfo.op = newThreadEntry.op;
    } else {
        newThreadEntry.op = serverInfo.op;
    }
    return newThreadEntry;
}*/

/*function blankEntry(info){
    //this is the default stuff you want to actually go out to the user
    //don't put your private key here, for instance
    return {
        title: info.title,
        server: info.server,
        mode: info.mode,
        settings: info.settings
    };
}*/

function processFiles(filesInfo, callback){
    var files = [];
    var filenames = [];
    var fileDims = [];
    var fileSizes = [];
    //TODO handle more than 1 file 
    //for each file
    
    if (filesInfo != null && filesInfo.buffer != null){
        //TODO validate file
        //TODO handle the error when an invalid file is passed (e.g. a jpg that's actually a webm)
        var filenameSplit = filesInfo.originalname.split('.');
        if (settings.fileFormats.length == 0 || (filenameSplit.length > 0 && settings.fileFormats.indexOf(filenameSplit[filenameSplit.length - 1]) != -1)){

            //var fileHash = sio.ipfsAddSyncFs(filesInfo.path);
            sio.ipfsAddBuffer(filesInfo.buffer, function(fileObj){
                sio.ipfsNameObject(fileObj, filesInfo.originalname, (filename) => {
                    //filenames.push(sio.ipfsNameObjectSync(fileObj.hash, filesInfo.originalname));
                    filenames.push(filename);
                    //TODO thumbnail files
                    //TODO make this async (done?)
                    fileDims.push(imgDims(filesInfo.buffer));
                    fileSizes.push(filesInfo.size);
                    console.log(filenames);
                    //for each file
                    files.push({
                        address: filenames[0],
                        height: fileDims[0].height,
                        width: fileDims[0].width,
                        size: fileSizes[0]
                    });
                        
                    callback(files);
                });

            
            });
            

        } else {
            callback(files);
        }
    } else {
        callback(files);
    }
    

}

function updateMods(posterID, thread, postNo){
    if (boardBindings[thread] != null){
        for (let item of boardBindings[thread]){
            sio.loadJsonObj('http://localhost:8080' + item, function(response){//TODO move to API ver.
                if (response != null){
                    sio.loadJsonObj('http://localhost:8080' + JSON.parse(response).settings, function(settings){
                        if (settings != null){
                            for (let mod of JSON.parse(settings).mods){
                                sio.loadJsonObj('http://localhost:8080' + JSON.parse(settings).mods, function(modResponse){
                                    if (modResponse != null){
                                        sio.sendPost(JSON.parse(modResponse).server, {operation: 'register', thread: thread, postNo: postNo, posterID: posterID});
                                    }
                                });
                            }
                        
                        
                        
                        
                            /*sio.loadJsonObj('http://localhost:8080' + JSON.parse(settings).mods, function(mod){
                                if (mod != null){
                                    let modsArr = JSON.parse(mod);
                                    console.log('the horror');
                                    console.log(modsArr)
                                    for (let mod of modsArr){
                                        sio.sendPost(mod.server, {operation: 'register', thread: threadAddress, postNo: postNo, posterID: posterID});
                                    }
                                }
                            });*/
                        }
                    });
                }
            });
        }
    }
}

function handlePost(postRaw, filesInfo, thread, posterID){
    //process files
    processFiles(filesInfo, function(files){
        
        //process post
        var post = buildPostJson(postRaw, files);
        
        if (filesInfo == null && (post.body == '' || post.body == null)) {
            //return;
        }
        
        if (post.email != 'sage' || globalStates[thread].lastbump == null) {
            globalStates[thread].lastbump = slog.sLogTimestamp();
        }
                
        sio.ipfsAddJson(post, function(address){
            //TODO critical section starts here
                
            //var payload = slog.constructPayload('add', {address: address}, ++globalStates[thread].lastSeqNo);//TODO move this inside addItemToState? critical section should be exclusively in there
            util.addItemToState('add', {address: address}, thread, globalStates[thread], blankEntry);
            
            updateMods(posterID, thread, globalStates[thread].lastSeqNo);
        });
    });
}

//this function is probably the biggest disaster of the project
//ALL sending of direct messages via XHRs should be deprecated in favour of IPFS-based P2P
function newThreadBridge(postRaw, filesInfo, res, posterID){
    return function(thread){
        //TODO send a message off to the board(s) this thread is to be attached to
        //yes, a thread can theoretically belong to more than one board
        
        var boardsWaiting = 0;
        var postHandled = false;
        if (postRaw.board != null && postRaw.board != '' && postRaw.board.length > 0){
            //get the board's ip
            for (let item of postRaw.board){
                //record the binding    
                if (boardBindings[thread] == null) {
                    boardBindings[thread] = [];
                }
                boardBindings[thread].push(item);
                sio.saveObjectAsync('board_bindings.json', boardBindings);
            
                boardsWaiting++;
                console.log('now getting ' + item);
                slog.getSLog(item, 0, null, function (response){
                    //send the thread id
                    console.log('Now trying to send to ' + response[0].server);
                    sio.sendPost(response[0].server, {thread: '/ipns/' + thread, board: item}, function(boardResponse){
                        console.log('Board responded with: ');
                        console.log(boardResponse);
                        if (boardResponse != null) {
                            res.send(boardResponse + '');
                        }//right now this only allows for a single board TODO change this because it'll crash if the user specifies multiple boards
                        //res.send(JSON.stringify({thread: boardResponse, board: item}));
                        
                        boardsWaiting--;
                        if (boardsWaiting == 0 && !postHandled){
                            postHandled = true;
                            handlePost(postRaw, filesInfo, thread, posterID);
                        }
                    });
                });
            }
        }
        if (boardsWaiting == 0 && !postHandled) {
            handlePost(postRaw, filesInfo, thread, posterID);
        }
    };
}

function getNewThread(){
    return {
        //title: "/test/ - My Shitpoos",
        lastAddress: null,
        lastSeqNo: 0,
        mode: 'reply',
        //settings: settings,
        server: serverInfoGlobal.server
    };
}

function handleInput(postRaw, filesInfo, res, posterID){
    if (postRaw.thread != null && postRaw.thread != ''){
        var thread = slog.hashFromAddress(postRaw.thread);
        if (globalStates[thread] == null){
            res.status(404).send('Tried to post to dead thread.');
            return;
        }
        handlePost(postRaw, filesInfo, thread, posterID);
        res.send('Post Successful');
    } else {
        util.addNewState(getNewThread(), globalStates, serverInfoGlobal.useKeyFile, false, blankEntry, newThreadBridge(postRaw, filesInfo, res, posterID));
        //createNewThread(serverInfoGlobal.server, true, newThreadBridge(postRaw, filesInfo));
    }
    //res.send('Post Successful');
}

//TODO need to cap filesize
app.post('/', upload.single('file'), function (req, res, next) {
    console.log('post received: ' + JSON.stringify(req.body));
    //TODO file can probably live in memory
    //TODO https://stackoverflow.com/questions/16038705/how-to-wrap-a-buffer-as-a-stream2-readable-stream#16039177
    console.log(req.file);
    res.set('Access-Control-Allow-Origin', '*');
    if (req.body) {
        handleInput(req.body, req.file, res, req.connection.remoteAddress);
    }
    
});

function setupServer(){
    boardBindings = sio.loadObjectIfExists('board_bindings.json');
    if (!boardBindings) {
        boardBindings = {};
    }

    /*sio.loadAll(globalStates, 'states', function(){
        sio.ipfsPublishAll(globalStates);
    });*/
    
    serverInfoGlobal.server = serverAddress + ':' + listener.address().port;
    
    sio.loadAll(globalStates, 'states', function(){
        //console.log(globalStates)
        if (Object.keys(globalStates).length < 1){
            util.addNewState(getNewThread(), globalStates, serverInfoGlobal.useKeyFile, true, blankEntry);//, function(){
            //sio.saveObject("serverkey", globalStates[Object.keys(globalStates)[0]].pubKey);
            //});//TODO this breaks everything when changing IPs for some reason
        } else {
            util.publishWithServer(globalStates, serverInfoGlobal.server, blankEntry);
            //sio.saveObject("serverkey", globalStates[Object.keys(globalStates)[0]].pubKey);
        }
    });

    //serverInfoGlobal.settings = sio.ipfsAddSync(settings);//TODO this should be done in boardmanager.js
    
    
    //util.addNewState(getNewThread(), globalStates, globalSLogs, serverInfoGlobal.useKeyFile, true, blankEntry);
    
    //createNewThread(serverInfoGlobal.server, serverInfoGlobal.useKeyFile);
    
    //util.republishAllSettings();
    
    console.log('Now listening on ' + serverInfoGlobal.server);
    
}

var listener = app.listen(port, function(){
    setupServer();
});

/*var threadActual = {
    payload: null,
    title: "/test/ - My Shitpoos",
    lastPostNo: null,
    imageCount: null,
    op: null,
    server: null,
    pubkey: null
};*/

/*function handlePost(postRaw, thread){
    post = buildPostJson(postRaw);
    lock.writeLock(function (release) {
        var postAddress = "/ipfs/" + sio.ipfsAddSync(post);
        addPostToThread(postAddress, thread);
        thread.address = sio.ipfsAddSync(getPublishableThread(thread));
        sio.ipfsPublish(thread.address);
        thread.address = "/ipfs/" + thread.address;
        sio.saveObject("threadlatest", thread);
	    release();
    });
}*/

//saveObject("defaultthread", threadSLog);
//threadSLog = sio.loadObject("threadlatest");
//serverInfoGlobal = sio.loadObject("serverinfolatest");

/*var listener = app.listen(0, function(){
    console.log("listening on port " + listener.address().port);
    threadSLog.server = "http://localhost:" + listener.address().port;
    ipfsPublish(ipfsAddSync(getPublishableThread(threadSLog)));
});*/

/*https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(55555);

threadSLog.server = "https://localhost:" + "55555";*/
//ipfsPublish(ipfsAddSync(getPublishableThread(threadSLog)));
