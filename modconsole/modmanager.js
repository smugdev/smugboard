var sio = require('../common/sio.js');
var slog = require('../common/slog.js');
var util = require('../common/util.js');

//var imgDims = require('image-size');
var express = require('express');
var app = express();
var cors = require('cors');
var multer  = require('multer');
var upload = multer({ dest: '/tmp' });

app.use(cors());

var serverAddress = require('../common/settings.js').getAddress();//sio.loadObject('../common/settings.json').serverAddress;
var port = 3004; //0 makes the program just pick something free

var serverInfoGlobal = {
    server: null,
    useKeyFile: true,
};

var globalStates = {};

var blacklist = []; //[{mod: mymod, bans: [{posterID: posterID, banEnd: banEnd, banReason: banReason}]}]

var knownBindings = []; //[{posterID: myID, posts: [{threadAddress: threadAddress, postNo: postNo}]}]

function blankEntry(info, payload){
    //this is the default stuff you want to actually go out to the user
    //don't put your private key here, for instance
    var entry = {
        title: info.title,
        server: info.server,
        mode: info.mode,
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
        //pubkey: serverInfo.pubkey
    };
}

function getBoundID(threadAddress, postNo){
    if (threadAddress != null && postNo != null) {
        for (let item of knownBindings) {
            for (let post of item.posts) {
                if (threadAddress == post.threadAddress && postNo == post.postNo) {
                    return post.posterID;
                }
            }
        }
    }
    
    return null;
}

function registerPostActual(posterID, threadAddress, postNo){
    if (posterID != null && threadAddress != null && postNo != null){
        var post = {threadAddress: threadAddress, postNo: postNo};

        let posterFound = false;
        for (let posterBinding of knownBindings){
            if (posterBinding.posterID == posterID){
                posterFound = true;
                posterBinding.posts.push(post);
            }
        }
        
        if (!posterFound) {
            knownBindings.push({posterID: posterID, posts: [post]});
        }
            
        sio.saveObjectAsync('known_bindings.json', knownBindings);
    }
}

function banID(mod, posterID, banEnd, banReason){
    if (mod != null && posterID != null){
        var ban = {posterID: posterID};
        if (banEnd != null) {
            ban.banEnd = banEnd;
        }
        if (banReason != null) {
            ban.banReason = banReason;
        }
        
        let modFound = false;
        for (let item of blacklist){
            if (item.mod == mod){
                modFound = true;
                item.bans.push(ban);
            }
        }

        //TODO This shouldn't need to be here (in newMod() instead)
        if (!modFound){
            console.log('Logic error: Could not find mod ' + mod);
            //blacklist.push({mod: mod, bans: [ban]});
        }
            
        sio.saveObjectAsync('blacklist.json', blacklist);
    }

}

function deleteIfBanned(posterID, threadAddress, postNo, callback){
    if (posterID != null && threadAddress != null && postNo != null){
        for (let item of blacklist){
            for (let ban of item.bans){
                if (ban.posterID == posterID && slog.sLogTimestamp > ban.banEnd){
                    deletePost(item.mod, threadAddress, postNo);
                }
            }
        }
        if (callback) {
            callback();
        }
    }
}

function deletePostsByID(mod, posterID, callback){
    if (mod != null && posterID != null){
        for (let posterBinding of knownBindings){
            if (posterBinding.posterID == posterID){
                for (let post of posterBinding.posts){
                    deletePost(mod, post.thread, post.postNo);
                }
                break;
            }
        }
        
        if (callback) {
            callback();
        }
    }
}

function deletePost(mod, thread, postNo, callback){
    if (mod != null && thread != null && postNo != null && globalStates[mod] != null){
        console.log('got there');
        mod = slog.hashFromAddress(mod);//TODO see if i can do away with this line
        //var payload = slog.constructPayload('add', {thread: thread, postNo: postNo}, ++globalStates[mod].lastSeqNo);
        util.addItemToState('add', {thread: thread, postNo: postNo}, mod, globalStates[mod], blankEntry);

        if (callback) {
            callback();
        }
    }
}

function undeletePost(mod, thread, postNo, callback){
    if (mod != null && thread != null && postNo != null && globalStates[mod] != null){
        console.log('got there');
        mod = slog.hashFromAddress(mod);//TODO see if i can do away with this line
        //var payload = slog.constructPayload('remove', {thread: thread, postNo: postNo}, ++globalStates[mod].lastSeqNo);
        util.addItemToState('remove', {thread: thread, postNo: postNo}, mod, globalStates[mod], blankEntry);

        if (callback) {
            callback();
        }
    }
}

function newMod(title, password, res){
    if (title != null){
        var mod = {
            title: title,
            lastAddress: null,
            lastSeqNo: 0,
            mode: 'mod',
            password: password,//TODO make the password actually do something
            server: serverInfoGlobal.server
        };        

        util.addNewState(mod, globalStates, true, true, blankEntry, function(pubkey){
            blacklist.push({mod: '/ipns/' + pubkey, password: password, bans: []});
            sio.saveObjectAsync('blacklist.json', blacklist);
            
            res.send('/ipns/' + pubkey);
        });
        
    } 
    /*else if (postRaw.operation == 'register'){
        if (postRaw.posterID != null && postRaw.threadAddress != null && postRaw.postNo != null){
            registerPost(postRaw.posterID, postRaw.threadAddress, postRaw.postNo);
            deleteIfBanned(postRaw.posterID, postRaw.threadAddress, postRaw.postNo);
            res.send('Registration successful');
        } else {
            res.status(400).send('Malformed request.');
        }
    }*/
}

function registerPost(posterID, threadAddress, postNo, res){
    if (posterID != null && threadAddress != null && postNo != null){
        //console.error('posterID: ' + posterID + ' threadAddress: ' + threadAddress + ' postNo: ' + postNo);
        registerPostActual(posterID, threadAddress, postNo);
        deleteIfBanned(posterID, threadAddress, postNo);
        res.send('Registration successful');
    } else {
        res.status(400).send('Malformed request.');
    }
}

function authenticateMod(mod, password){//TODO don't use plain text for passwords TODO TODO
    if (mod != null && password != null){
        for (let item of blacklist){
            if (item.mod == mod && item.password == password){
                return true;
            }
        }
    }
    
    return false;
}

function handleInput(postRaw, posterID, res){
    /*if (postRaw.admin == 'true'){
        admin(postRaw, res);
    } else */
    if (postRaw.operation != null){
        if (postRaw.operation == 'new'){//TODO need an auth structure such that not anyone can add a mod. All mods have access to all the info (including posting history) that the modmanager knows about TODO
            newMod(postRaw.title, postRaw.password, res);
        } else if (authenticateMod(postRaw.mod, postRaw.password) || postRaw.operation == 'register'){//TODO currently no auth for threadmanagers telling modmanagers when new posts come in
            switch (postRaw.operation){
            case 'delete':
                deletePost(slog.hashFromAddress(postRaw.mod), postRaw.thread, postRaw.postNo, function(){
                    res.send('Deletion Successful');
                });
                break;
            case 'undelete':
                undeletePost(slog.hashFromAddress(postRaw.mod), postRaw.thread, postRaw.postNo, function(){
                    res.send('Undeletion Successful');
                });
                break;
            case 'deleteall':
                //deleteIfBanned(getBoundID(postRaw.thread, postRaw.postNo), postRaw.thread, postRaw.postNo, function(){
                deletePostsByID(postRaw.mod, getBoundID(postRaw.thread, postRaw.postNo), function(){
                    res.send('Deletion Successful');
                });
                break;
            case 'ban':
                banID(slog.hashFromAddress(postRaw.mod), getBoundID(postRaw.thread, postRaw.postNo), postRaw.banEnd, postRaw.banReason);
                break;
            case 'bandelete':
                banID(slog.hashFromAddress(postRaw.mod), getBoundID(postRaw.thread, postRaw.postNo), postRaw.banEnd, postRaw.banReason);
                deletePost(slog.hashFromAddress(postRaw.mod), postRaw.thread, postRaw.postNo, function(){
                    res.send('Deletion Successful');
                });
                break;
                /*case 'new':
                    newMod(postRaw.title, postRaw.password, res);
                    break;*/
            case 'register':
                registerPost(posterID, postRaw.thread, postRaw.postNo, res);
                //registerPost(getBoundID(postRaw.thread, postRaw.postNo), postRaw.thread, postRaw.postNo, res);//TODO posterID seems to come from nowhere? shouldn't we do deleteIfBanned() here?
                //deleteIfBanned(getBoundID(postRaw.thread, postRaw.postNo), postRaw.thread, postRaw.postNo, function(){
                //res.send('Sweep Successful');
                //});
                break;
            default:
                res.status(400).send('Malformed request.');
            }
        } else {
            console.log('Failed authentication: ' + postRaw.mod);
            res.status(403).send('Incorrect user address or password.');
        }
        
        /*if (postRaw.operation == 'delete'){
        } else if (){
        }
        var mod = slog.hashFromAddress(postRaw.mod);
        if (globalStates[mod] != null){
            deletePost(mod, postRaw.thread, postRaw.postNo, function(){
                res.send('Deletion Successful');
            });
        } else {
            res.status(404).send('Mod account does not exist.');//TODO put this somewhere else
        }*/
    } else {
        res.status(400).send('Malformed request.');
    }
}

app.post('/', upload.fields([]), function (req, res, next) {//TODO get rid of file uploads
    console.log('data received: ' + JSON.stringify(req.body));
    //console.log(req)
    if (req.body != null) {
        handleInput(req.body, req.connection.remoteAddress, res);
    }
    
    console.log('request complete');
});

function setupServer(){
    knownBindings = sio.loadObjectIfExists('known_bindings.json');
    if (!knownBindings) {
        knownBindings = [];
    }
        
    blacklist = sio.loadObjectIfExists('blacklist.json');
    if (!blacklist) {
        blacklist = [];
    }
        
    /*sio.loadAll(globalStates, 'states', function(){
        sio.ipfsPublishAll(globalStates);
    });*/

    serverInfoGlobal.server = serverAddress + ':' + listener.address().port;
    
    sio.loadAll(globalStates, 'states', function(){
        util.publishWithServer(globalStates, serverInfoGlobal.server, blankEntry);
    });
    
    //util.republishAllSettings();
    
    console.log('Now listening on ' + serverInfoGlobal.server);
}

var listener = app.listen(port, function(){
    setupServer();
});

