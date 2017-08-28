var slog = require('../common/slog.js');
var sio = require('../common/sio_browser.js');
var page = require('./inc/page.js');
var modTools = require('./inc/modtools.js');
var refresh = require('./inc/refresh.js');
var post = require('./inc/post.js');
var functions = require('./inc/functions.js');
var queue = require('./inc/queue.js');
var serverAddress = require('../common/settings.js').serverAddress;

var pageStatus = {};
//var collectedServers = {};
//var currentAddress;
var modSLogs = {};
var loadingMods = 0;

//var window.addressParsed = [];

function onPostLoad(postDiv, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged){
    return function(postJson){        
        page.fillPost(postDiv, postJson, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged);
        refresh.refreshStatus.currentlyRefreshing--;
        
        let release = false;
        let currBlockers = queue.getBlockers();
        for (let item of currBlockers){//TODO
            if (item.type == 'post' && item.id == postDiv.id){
                item.loaded = release = true;
            }
        }
        if (release)//a post might be added by both loadPage() and handleThreadStub()
        {
            queue.releaseQueued();
        }
    };
}

function onCatalogPostLoad(postDiv, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged, numReplies){
    return function(postJson){        
        page.fillCatalogPost(postDiv, postJson, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged, numReplies);
    };
}

function handleThreadStub(address, threadDiv, fromIndex, threadSeqNo){
    return function(sLog){
        queue.addToQueue(function (){
            for (let item of threadDiv.childNodes) {
                if (item.data != null && item.data == 'Loading...') {
                    item.remove();
                }
            }
            //document.getElementById('thread-' + address).innerHTML = '';
            if (sLog.length > 0){
                threadDiv.setAttribute('data-lastbump', sLog[sLog.length - 1].lastbump);
            
                var payloads = slog.calculateSLogPayloads(sLog);
                //payloads.reverse();
                
                var activeMods = [];
                let currBlockers = queue.getBlockers();
                for (let item of currBlockers){
                    if (item.type == 'mod'){
                        if (item.loaded == false) {
                            console.log('Logic error, mod not loaded properly which shouldn\'t be possible if we got here.');
                        } else {
                            activeMods.push(item);
                        }
                    }
                }
                
                mod = null;
                for (let item of activeMods){
                    let currMods = modTools.getMods();
                    for (let currMod of currMods){
                        if (currMod.address == item.address){
                            mod = item.address;//it is currently assumed you're only going to be one mod at once, but this may screw up if you're both board and global mods
                        }
                    }
                }
                
                if (mod){
                    for (let item of activeMods){
                        payloads = slog.calculateFlagSLogPayloads(address, payloads, item.payloads);
                    }
                } else {
                    for (let item of activeMods){
                        payloads = slog.calculateDeletionSLogPayloads(address, payloads, item.payloads);
                        for (let modPayload of item.payloads){
                            if (modPayload.data.thread == address && modPayload.data.postNo == 1){
                                threadDiv.parentNode.removeChild(threadDiv);
                                return;
                            }
                        }
                    }
                }
                
                /*let opDeleted = true;//TODO this is all totally busted. As of right now, there's no way to delete an OP
                for (let item of payloads)//this works because if you're a mod, OP is still in the payloads
                    if (sLog[sLog.length - 1].op == null || item.data.address == sLog[sLog.length - 1].op.address)//TODO i think only the first condition is needed
                        opDeleted = false;
                
                if (opDeleted || payloads == null || payloads.length < 1){//one of these is redundant
                    threadDiv.remove();
                } else */{
                    var orderByCreation = true;
                    //bump thread via insertion sort
                    //var index = payloads.length - 1;//orderByCreation ? 0 : payloads.length - 1;
                    var myBump = parseInt(payloads[0].timestamp, 10);//TODO implement creation-based ordering
                    for (let sibling of threadDiv.parentNode.childNodes){
                        var siblingBump = null;
                        if (sibling.getAttribute != null && sibling.getAttribute('data-lastbump') != null) {
                            siblingBump = parseInt(sibling.getAttribute('data-lastbump'), 10);
                        }
                        if (siblingBump == null || siblingBump < myBump){
                            threadDiv.parentNode.insertBefore(threadDiv, sibling);
                            break;
                        }
                    }
                    
                    var baseID = '';
                    for (let item of window.addressParsed){
                        if (item.mode == 'site' || item.mode == 'index' || item.mode == 'reply'){
                            if (baseID == '') {
                                baseID = item.publicAddress;
                            } else {
                                baseID += '/' + item.publicAddress;
                            }
                        }      
                    }  
                    
                    var anchor = null;
                    //OP's post
                    if (sLog[sLog.length - 1].op != null){
                        let opID = baseID + '/' + (threadSeqNo != null ? threadSeqNo + '/': '') + 1;//TODO i don't think i need to treat OP differently anymore //yeah i do, the index doesn't know about the OP otherwise
                        if (document.getElementById(opID) == null){
                            anchor = page.appendPostDiv(threadDiv, anchor);
                            anchor.setAttribute('data-thread', address);
                            //anchor.setAttribute('data-timestamp', sLog[sLog.length - 1].op.timestamp);
                            anchor.setAttribute('id', opID);
                            refresh.refreshStatus.currentlyRefreshing++;
                            
                            queue.pushBlocker({
                                id: opID,
                                loaded: false,
                                type: 'post'
                            });
                            
                            sio.getJsonObjFromAPI(sLog[sLog.length - 1].op.address, onPostLoad(anchor, 1, sLog[sLog.length - 1].op.timestamp, fromIndex, threadSeqNo, mod));//TODO timestamp is wrong
                        }
                    }
                    
                    //if (threadDiv.childNodes.length > 0)//TODO this is broken
                    //anchor = threadDiv.childNodes[threadDiv.childNodes.length - 1];
                    for (let item of payloads){
                        let itemID = baseID + '/' + (threadSeqNo != null ? threadSeqNo + '/': '') + item.seqNo;
                        if (document.getElementById(itemID) == null && (sLog[sLog.length - 1].op == null || item.seqNo != 1)){
                            anchor = page.appendPostDiv(threadDiv, anchor);
                            anchor.setAttribute('data-thread', address);//TODO set this stuff in onPostLoad //or not at all?
                            //anchor.setAttribute('data-timestamp', item.timestamp);
                            anchor.setAttribute('id', itemID);
                            refresh.refreshStatus.currentlyRefreshing++;
                            
                            queue.pushBlocker({
                                id: itemID,
                                loaded: false,
                                type: 'post'
                            });
                            
                            sio.getJsonObjFromAPI(item.data.address, onPostLoad(anchor, item.seqNo, item.timestamp, fromIndex, threadSeqNo, mod, item.flagged));
                        }
                    }
                }
            }
            refresh.refreshStatus.currentlyRefreshing--;
        }, ['mod', 'settings']);
    };
}

function handleCatalogStub(address, threadDiv, fromIndex, threadSeqNo){
    return function(sLog){
        queue.addToQueue(function (){
            //document.getElementById('thread-' + address).innerHTML = '';
            if (sLog.length > 0){
                threadDiv.setAttribute('data-lastbump', sLog[sLog.length - 1].lastbump);
                    
                var activeMods = [];
                let currBlockers = queue.getBlockers();
                for (let item of currBlockers){
                    if (item.type == 'mod'){
                        if (item.loaded == false) {
                            console.log('Logic error, mod not loaded properly which shouldn\'t be possible if we got here.');
                        } else {
                            activeMods.push(item);
                        }
                    }
                }
                    
                mod = null;
                for (let item of activeMods){
                    let currMods = modTools.getMods();
                    for (let currMod of currMods){
                        if (currMod.address == item.address){
                            mod = item.address;//it is currently assumed you're only going to be one mod at once, but this may screw up if you're both board and global mods
                        }
                    }
                }
                    
                let flagged = false;
                for (let item of activeMods){
                    for (let payload of item.payloads){
                        if (address == payload.data.thread && payload.data.postNo == 1){
                            if (mod){
                                flagged = true;
                            } else {
                                threadDiv.parentNode.removeChild(threadDiv);
                                return;
                            }
                        }
                    }
                }
                        
                var baseID = '';
                for (let item of window.addressParsed){
                    if (item.mode == 'site' || item.mode == 'index' || item.mode == 'reply'){
                        if (baseID == '') {
                            baseID = item.publicAddress;
                        } else {
                            baseID += '/' + item.publicAddress;
                        }
                    }
                }
                    
                //OP's post
                if (sLog[sLog.length - 1].op != null){
                    let opID = baseID + '/' + (threadSeqNo != null ? threadSeqNo + '/': '') + 1;
                    if (document.getElementById(opID) == null){
                        //anchor.setAttribute('data-timestamp', sLog[sLog.length - 1].op.timestamp);
                        //anchor.setAttribute('id', opID);
                        refresh.refreshStatus.currentlyRefreshing++;
                            
                        /*queue.pushBlocker({
                                id: opID,
                                loaded: false,
                                type: 'post'
                            });*/
                            
                        sio.getJsonObjFromAPI(sLog[sLog.length - 1].op.address, onCatalogPostLoad(threadDiv, 1, sLog[sLog.length - 1].op.timestamp, fromIndex, threadSeqNo, false, flagged, sLog[sLog.length - 1].payload.seqNo - 1));//TODO timestamp is wrong
                    }
                }
            }
        }, ['mod', 'settings']);
    };
}

function loadThread(address, sLog){
    if (!pageStatus[address].htmlLoaded){
        page.setThreadHTML();
        
        page.fillBoardlist(pageStatus);
        
        let fromIndex = false;
        for (let item of window.addressParsed) {
            if (item.mode == 'index') {
                fromIndex = true;
            }
        }
        
        if (fromIndex){
            document.getElementById('thread-return').setAttribute('href', functions.getNewHash(window.addressParsed, ['reply', 'post']));//TODO 'reply' is confusing now that there's also 'post', change it to 'thread' everywhere
            document.getElementById('catalog-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']) + '/catalog');
            document.getElementById('index-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']));
        } else {
            document.getElementById('thread-return').parentNode.removeChild(document.getElementById('thread-return'));
            document.getElementById('catalog-link').parentNode.removeChild(document.getElementById('catalog-link'));
            document.getElementById('index-link').parentNode.removeChild(document.getElementById('index-link'));
        }
        
        /*var cAddress = parseAddress(location.hash);//TODO: upgrade to new parse system
        if (cAddress.site == null || cAddress.index == null)
            document.getElementById('thread-return').parentNode.removeChild(document.getElementById('thread-return'));
        else
            document.getElementById('thread-return').setAttribute('href', '#' + cAddress.site + '/' + cAddress.index);*/
        
        document.getElementById('update_thread').setAttribute('onclick', 'return smug.refreshThread("' + address + '", smug.pageStatus, smug.handlePage);');
        
        /*addToQueue(function(){
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    if (item.loaded != true)
                        console.log('Logic error.');//TODO remove if this never happens
                    else
                        page.setTitle(parseAddress(location.hash).index, item.settings.title);//TODO: upgrade to new parse system
                }
                break;
            }
        }, ['settings']);*/
        
        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    if (item.loaded == true){
                        let componentPublicAddress = null;
                        for (let addressComponent of window.addressParsed) {
                            if (addressComponent.mode == 'index') {
                                componentPublicAddress = addressComponent.publicAddress;
                            }
                        }//TODO in some esoteric configuration, might be more than one index chained together
                        page.setTitle(componentPublicAddress, item.settings.title);
                    } else {
                        console.log('Logic error.');//TODO remove if this never happens
                    }
                }
                //break; //maybe there's a bunch of indexes chained together?
            }
        }, ['settings']);
        
        /*addToQueue(function(){
            //TODO
        }, ['settings', 'banners']);*/
        
        //page.setTitle(cAddress.index, 'Testing');
        
        pageStatus[address].htmlLoaded = true;
    }
    
    //pageStatus[address].server = sLog[sLog.length - 1].server;
    
    document.getElementById('submit').setAttribute('onclick', 'smug.submitPost("postform", "' + pageStatus[address].server + '", function(){smug.refreshStatus.currTime = 5;})');
    document.getElementsByName('thread')[0].setAttribute('value', address);
    //document.getElementsByName('board[]')[0].setAttribute('value', '/ipns/QmHash');//TODO remove this

    var threadDiv = document.getElementById('thread-' + address);
    if (!threadDiv){
        var threadContainerDiv = document.getElementById('thread');
        threadDiv = document.createElement('div');
        threadDiv.setAttribute('id', 'thread-' + address);
        threadContainerDiv.appendChild(threadDiv);
    }
    
    refresh.refreshStatus.currentlyRefreshing++;
    handleThreadStub(address, threadDiv, false, null)(sLog);
    
    refresh.autoRefresh(address, pageStatus, handlePage)();//TODO need to refresh mods as well each time
}

function newThreadCreated(serverResponse){
    //setTimeout(function(){//TODO currently just waits 4 seconds so that the update goes through, should actually wait for the update to be pushed back (in boardmanager)
    var newHash = '#';
    for (let item of window.addressParsed) {
        if (item.mode != null) {
            if (item.mode == 'site' || item.mode == 'index')//TODO should use functions.getNewHash()
            {
                newHash += '/' + item.publicAddress;
            }
        }
    }
    newHash += '/' + serverResponse;
    location.hash = newHash;
    //}, 4000);
    
    /*var cAddress = parseAddress(location.hash);//TODO: upgrade to new parse system
    if (cAddress.single != null)
        location.hash = '#' + cAddress.single + '/' + threadSeqNo;
    else if (cAddress.board != null && cAddress.site != null)
        location.hash = '#' + cAddress.site + '/' + cAddress.board + '/' + threadSeqNo;*/
}

function loadIndex(address){
    if (!pageStatus[address].htmlLoaded){
        page.setIndexHTML();
        document.getElementById('catalog-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']) + '/catalog');
        document.getElementById('index-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']));
        
        page.fillBoardlist(pageStatus);
        
        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    if (item.loaded == true){
                        let componentPublicAddress = null;
                        for (let addressComponent of window.addressParsed) {
                            if (addressComponent.mode == 'index' && addressComponent.actualAddress == address) {
                                componentPublicAddress = addressComponent.publicAddress;
                            }
                        }
                        page.setTitle(componentPublicAddress, item.settings.title);
                    } else {
                        console.log('Logic error.');//TODO remove if this never happens
                    }
                }
            }
        }, ['settings']);

        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    sio.getJsonObjFromAPI(item.settings.threadServers[0], function(serverJson){
                        document.getElementById('submit').setAttribute('onclick', 'smug.submitPost("postform", "' + JSON.parse(serverJson).server + '", smug.newThreadCreated)');
                    });
                }
            }
        }, ['settings']);

        pageStatus[address].htmlLoaded = true;
    }
    
    document.getElementsByName('board[]')[0].setAttribute('value', address);

    var payloads = slog.calculateSLogPayloads(pageStatus[address].sLog);
    var anchor = document.getElementById('stub');
    for (let item of payloads){
    
    
        var threadDiv = document.getElementById('thread-' + item.data.address);
        if (!threadDiv){
            var threadContainerDiv = document.getElementById('thread');
            threadDiv = document.createElement('div');
            threadDiv.setAttribute('id', 'thread-' + item.data.address);
            threadDiv.appendChild(document.createElement('hr'));
            threadDiv.appendChild(document.createTextNode('Loading...'));
            var index = Array.prototype.indexOf.call(threadContainerDiv.childNodes, anchor);

            //threadContainerDiv.insertBefore(, threadContainerDiv.childNodes[index]);
            threadContainerDiv.insertBefore(threadDiv, threadContainerDiv.childNodes[index]);
        }
        
        refresh.refreshStatus.currentlyRefreshing++;
        slog.getSLog(item.data.address, 3, null, handleThreadStub(item.data.address, threadDiv, true, item.seqNo), null);
        
        anchor = threadDiv;
    }
}
function loadCatalog(address){
    if (!pageStatus[address].htmlLoaded){
        page.setCatalogHTML();
        document.getElementById('catalog-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']) + '/catalog');
        document.getElementById('index-link').setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog']));
        
        page.fillBoardlist(pageStatus);
        
        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){//TODO this probably needs to become 'catalog'
                    if (item.loaded == true){
                        let componentPublicAddress = null;
                        for (let addressComponent of window.addressParsed) {
                            if (addressComponent.mode == 'index' && addressComponent.actualAddress == address) {
                                componentPublicAddress = addressComponent.publicAddress;
                            }
                        }
                        page.setTitle(componentPublicAddress, item.settings.title);
                    } else {
                        console.log('Logic error.');//TODO remove if this never happens
                    }
                }
            }
        }, ['settings']);

        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    sio.getJsonObjFromAPI(item.settings.threadServers[0], function(serverJson){
                        document.getElementById('submit').setAttribute('onclick', 'smug.submitPost("postform", "' + JSON.parse(serverJson).server + '", smug.newThreadCreated)');
                    });
                }
            }
        }, ['settings']);

        pageStatus[address].htmlLoaded = true;
    }
    
    document.getElementsByName('board[]')[0].setAttribute('value', address);

    var payloads = slog.calculateSLogPayloads(pageStatus[address].sLog);
    var anchor = document.getElementById('stub');
    for (let item of payloads){
        var threadDiv = document.getElementById('thread-' + item.data.address);
        if (!threadDiv){
            var threadContainerDiv = document.getElementById('Grid');
            threadDiv = page.getCatalogEmptyThread();
            threadDiv.setAttribute('id', 'thread-' + item.data.address);
            //threadDiv.innerHTML = 'Loading...';
            //threadDiv.appendChild(document.createElement('hr'));
            var index = Array.prototype.indexOf.call(threadContainerDiv.childNodes, anchor);

            //threadContainerDiv.insertBefore(, threadContainerDiv.childNodes[index]);
            threadContainerDiv.insertBefore(threadDiv, threadContainerDiv.childNodes[index]);
        }
        
        refresh.refreshStatus.currentlyRefreshing++;
        slog.getSLog(item.data.address, 0, null, handleCatalogStub(item.data.address, threadDiv, true, item.seqNo), null);
        
        anchor = threadDiv;
    }
}

/*function loadCatalog(address){
    if (!pageStatus[address].htmlLoaded){
        var htmlHeadContent = pageHtml.css;
        htmlHeadContent += pageHtml.favicon;
        var htmlBodyContent = pageHtml.header;
        //htmlBodyContent += pageHtml.uploadForm;
        htmlBodyContent += pageHtml.threadStub;
        htmlBodyContent += '<br><br><br>';

        document.head.innerHTML = htmlHeadContent;
        document.body.innerHTML = htmlBodyContent;
        
        queue.addToQueue(function(){
            let currBlockers = queue.getBlockers();
            for (let item of currBlockers){
                if (item.type == 'settings' && item.mode == 'index'){
                    if (item.loaded == true){
                        let componentPublicAddress = null;
                        for (let addressComponent of window.addressParsed)
                            if (addressComponent.mode == 'index' && addressComponent.actualAddress == address)
                                componentPublicAddress = addressComponent.publicAddress;
                        page.setTitle(componentPublicAddress, item.settings.title);
                    } else {
                        console.log('Logic error.');//TODO remove if this never happens
                    }
                }
            }
        }, ['settings']);
        
        pageStatus[address].htmlLoaded = true;
    }

    var payloads = slog.calculateSLogPayloads(pageStatus[address].sLog);
    var anchor = document.getElementById('stub');
    for (let item of payloads){
        var threadDiv = document.getElementById('thread-' + item.data.address);
        if (!threadDiv){
            var threadContainerDiv = document.getElementById('thread');
            threadDiv = document.createElement('div');
            threadDiv.setAttribute('class', 'mix thread grid-li grid-size-small');
            threadDiv.setAttribute('id', 'thread-' + item.data.address);
            threadDiv.innerHTML = 'Loading...';
            //threadDiv.appendChild(document.createElement('hr'));
            var index = Array.prototype.indexOf.call(threadContainerDiv.childNodes, anchor);

            //threadContainerDiv.insertBefore(, threadContainerDiv.childNodes[index]);
            threadContainerDiv.insertBefore(threadDiv, threadContainerDiv.childNodes[index]);
        }
        
        refresh.refreshStatus.currentlyRefreshing++;
        slog.getSLog(item.data.address, 0, null, handleThreadStub(item.data.address, threadDiv, true, item.seqNo), null);
        
        anchor = threadDiv;
    }
}*/

function loadSite(address, sLog){
    if (!pageStatus[address].htmlLoaded){
        page.setBoardlistHTML();
        page.fillBoardlistTable(pageStatus);
        page.fillBoardlist(pageStatus);
        pageStatus[address].htmlLoaded = true;
    }
    pageStatus[address].server = sLog[sLog.length - 1].server;
}

function loadIndexRegistration(address, sLog){
    if (!pageStatus[address].htmlLoaded){
        page.setCreationHTML();
        page.fillBoardlist(pageStatus);
        pageStatus[address].htmlLoaded = true;
    }
    
    document.getElementById('submit').setAttribute('onclick', 'smug.submitPost("postform", "' + pageStatus[address].server + '")');
    document.getElementById('modcreate').setAttribute('onclick', 'smug.submitPost("modcreateform", "' + serverAddress + ':3004", smug.setNewModAddress)');
    document.getElementById('create').setAttribute('onclick', 'smug.createBoard("' + serverAddress + ':3001", smug.setNewBoardAddress)');//TODO get the IP properly (requires the boardserver to have a proper root)
    
    //pageStatus[address].server = sLog[sLog.length - 1].server;
    
    document.getElementsByName('site')[0].setAttribute('value', address);
    
    //var payloads = slog.calculateSLogPayloads(pageStatus[address].sLog);
}

function loadOptions(){
    page.setOptionsHTML();
    page.fillBoardlist(pageStatus);
    
    document.getElementById('submit').setAttribute('onclick', 'smug.saveMods(); smug.goHome();');
}

function loadManagement(){
    page.setManageHTML();
    page.fillBoardlist(pageStatus);
}

function newPageStatus(){
    return {
        //sLog: [],
        lastProcessedID: null,
        htmlLoaded: false
    };
}

function processPage(address, callback){
    if (pageStatus[address] != null) {
        pageStatus[address].htmlLoaded = false;
    }
    
    if (pageStatus[address] == null || pageStatus[address].sLog == null) {
        slog.getSLog(address, -1, null, callback, null);
    } else {
        slog.updateSLog(pageStatus[address].sLog, address, -1, callback, null);
    }
}

function handlePage(address){
    return function (sLog){
        if (pageStatus[address] == null) {
            pageStatus[address] = newPageStatus();
        }

        if (sLog != null && sLog.length > 0){
            pageStatus[address].sLog = sLog;
            pageStatus[address].server = sLog[sLog.length - 1].server;
            //currentAddress = address;
            
            if (sLog[sLog.length - 1].mode == 'reply'){
                loadThread(address, sLog);
            } else if (sLog[sLog.length - 1].mode == 'site'){
                if (window.addressParsed[window.addressParsed.length -1].mode == 'create'){
                    loadIndexRegistration(address, sLog);
                } if (window.addressParsed[window.addressParsed.length -1].mode == 'options'){
                    loadOptions();
                } else if (window.addressParsed[window.addressParsed.length -1].mode == 'manage'){
                    loadManagement();
                } else {
                    loadSite(address, sLog);
                }
            } else if (sLog[sLog.length - 1].mode == 'index'){
                if (window.addressParsed[window.addressParsed.length -1].mode == 'catalog'){
                    loadCatalog(address);
                } else {
                    loadIndex(address);
                }
            } else {
                console.log('Invalid mode.');
            }
        } else if (address == 'settings'){
            loadSettingsPage();
        }
        //autoRefresh();
        refresh.refreshStatus.currentlyRefreshing--;
    };
}

function onModLoad(address){
    return function(sLog){
        let currBlockers = queue.getBlockers();
        for (let item of currBlockers){
            if (item.address == address){
                item.loaded = true;
                item.sLog = sLog;
                item.payloads = slog.calculateSLogPayloads(sLog);
            }
        }
        
        queue.releaseQueued();
    };
}

function onSettingsLoad(address){
    return function(settingsRaw){
        let mode = null;
        let settings = JSON.parse(settingsRaw);
        
        let currBlockers = queue.getBlockers();
        for (let item of currBlockers){
            if (item.address == address){
                item.loaded = true;
                mode = item.mode;
                item.settings = settings;
            }
        }
        
        //TODO handle banners here
        
        if (settings.mods != null && settings.mods.length > 0){
            for (let item of settings.mods){
                let alreadyLoaded = false;
                let currBlockers = queue.getBlockers();
                for (let known of currBlockers) {
                    if (known.address == item) {
                        alreadyLoaded = true;
                    }
                }//TODO maybe we want to refresh older mods here
                        
                if (!alreadyLoaded){
                    queue.pushBlocker({
                        address: item,
                        loaded: false,
                        type: 'mod',
                        mode: mode
                    });
                    slog.getSLog(item, -1, null, onModLoad(item), null);
                }
            }
        }
        
        queue.releaseQueued();
    };
}

function onPageLoad(addressActual, parseIndex){
    return function (sLog){
        if (sLog.length > 0){
            if (pageStatus[addressActual] == null) {
                pageStatus[addressActual] = newPageStatus();
            }
            
            pageStatus[addressActual].sLog = sLog;
            pageStatus[addressActual].server = sLog[sLog.length - 1].server;
            
            if (sLog[sLog.length - 1].settings != null){//TODO index settings should be a dropoff point, since you don't need thread settings to determine board name
                queue.pushBlocker({
                    address: sLog[sLog.length - 1].settings,
                    loaded: false,
                    type: 'settings',
                    mode: sLog[sLog.length - 1].mode
                });
                sio.getJsonObjFromAPI(sLog[sLog.length - 1].settings, onSettingsLoad(sLog[sLog.length - 1].settings));
            }
            
            /*if (sLog[sLog.length - 1].settings != null){
                queue.pushBlocker({
                    address: sLog[sLog.length - 1].settings,
                    loaded: false,
                    type: 'settings'
                });
                sio.loadJsonObj(sLog[sLog.length - 1].settings, function (settingsRaw){
                    for (let settingsQueued of currBlockers)
                        if (settingsQueued.address == sLog[sLog.length - 1].settings)//TODO this is a mess, this shouldn't be tied up necessarily with the mods
                            settingsQueued.loaded = true;
                    
                    
                    settings = JSON.parse(settingsRaw);
                    if (settings.mods != null && settings.mods.length > 0){
                        for (let item of settings.mods){
                            let alreadyLoaded = false;
                            for (let known of currBlockers)
                                if (known.address == item)
                                    alreadyLoaded = true;//TODO maybe we want to refresh older mods here
                                    
                            if (!alreadyLoaded){
                                queue.pushBlocker({
                                    address: item,
                                    loaded: false,
                                    type: 'mod'
                                });
                                slog.getSLog(item, -1, null, onModLoad(item), null);
                            }
                        }
                    }
                });
            }*/
            
            /*if (sLog[sLog.length - 1].mode == 'site' && cAddress.index != null)
                next = cAddress.index;
            else if (sLog[sLog.length - 1].mode == 'index' && cAddress.thread != null)
                next = cAddress.thread;*/
            
            /*if (window.addressParsed[parseIndex].mode == 'reply' && parseIndex < window.addressParsed.length - 1){
                window.addressParsed[parseIndex + 1].mode = 'post';
            }*/
            
            var next = null;
            window.addressParsed[parseIndex].mode = sLog[sLog.length - 1].mode;
            if (parseIndex < window.addressParsed.length - 1){
                if (window.addressParsed[parseIndex].mode == 'reply'){
                    window.addressParsed[parseIndex + 1].mode = 'post';
                    queue.pushBlocker({
                        id: location.hash.replace(/^#/, ''),
                        loaded: false,
                        type: 'post'
                    });
                    queue.addToQueue(functions.scrollToCurrentPost, ['settings', 'mod', 'post']);
                } else if (window.addressParsed[parseIndex].mode == 'site'){
                    if (window.addressParsed[parseIndex + 1].publicAddress == 'create'){
                        window.addressParsed[parseIndex + 1].mode = 'create';
                    } else if (window.addressParsed[parseIndex + 1].publicAddress == 'options'){
                        window.addressParsed[parseIndex + 1].mode = 'options';
                    } else if (window.addressParsed[parseIndex + 1].publicAddress == 'manage'){
                        window.addressParsed[parseIndex + 1].mode = 'manage';
                    } else {
                        next = window.addressParsed[parseIndex + 1].publicAddress;
                    }
                } else if (window.addressParsed[parseIndex].mode == 'index'){
                    if (window.addressParsed[parseIndex + 1].publicAddress == 'catalog'){
                        window.addressParsed[parseIndex + 1].mode = 'catalog';
                    } else {
                        next = window.addressParsed[parseIndex + 1].publicAddress;
                    }
                }
            }
            
            if (next == null){
                handlePage(addressActual)(sLog);
            } else {
                var payloads = slog.calculateSLogPayloads(sLog);
                
                //var nextAddress = null;
                for (let item of payloads){
                    if (item.data.uri == next || item.seqNo == next){
                        window.addressParsed[parseIndex + 1].actualAddress = item.data.address;
                        break;
                    }
                }
                
                if (window.addressParsed[parseIndex + 1].actualAddress == null){
                    document.body.innerHTML = 'Item not found (if you just posted a new thread, this is normal, please wait warmly).<br><br>Retrying in 3 seconds.';
                    setTimeout(function(){
                        window.location.reload(false);
                    }, 3000);
                } else {
                    processPage(window.addressParsed[parseIndex + 1].actualAddress, onPageLoad(window.addressParsed[parseIndex + 1].actualAddress, parseIndex + 1));
                }
            }
        } else {
            console.log('Problem loading page: Empty chain.');
        }
    };
}

function loadPage(){
    if (refresh.refreshStatus.currentlyRefreshing > 0){
        console.log('Currently refreshing something, can\'t gracefully reload page. Whatever, forcing hard reload...');
        window.location.reload(false);
    } else {
        var i;
        var isNewPage = false;
        var newAddressParsed = functions.parseLocationAddress(location.hash);
        if (window.addressParsed == null || newAddressParsed.length > window.addressParsed.length + 1 || newAddressParsed.length < window.addressParsed.length - 1){
            isNewPage = true;
        } else if (newAddressParsed.length == window.addressParsed.length - 1 && window.addressParsed[window.addressParsed.length - 1].mode != 'post'){
            isNewPage = true;
        } else if (newAddressParsed.length != window.addressParsed.length){
            isNewPage = true;
        } else {
            for (i = 0; i < window.addressParsed.length; i++) {
                if (window.addressParsed[i].mode == 'site' || window.addressParsed[i].mode == 'index' || window.addressParsed[i].mode == 'reply' || window.addressParsed[i].mode == 'create' || window.addressParsed[i].mode == 'options' || window.addressParsed[i].mode == 'manage')//TODO redo this in a non-dumb way (array)
                {
                    if (newAddressParsed[i].publicAddress != window.addressParsed[i].publicAddress) {
                        isNewPage = true;
                    }
                }
            }
        }
        
        if (isNewPage){
            window.clearTimeout(refresh.refreshStatus.timer);
            refresh.refreshStatus.justRefreshed = true;
            refresh.refreshStatus.currentlyRefreshing++;
            
            modTools.loadMods();
            
            document.body.innerHTML = 'Loading...';
            
            queue.resetBlockers();
            queue.resetStubs();
            //currBlockers = [];
            //queuedStubs = [];
            
            //if (address == null)
            //address = currentAddress = address.replace(/^#/, '');
            
            window.addressParsed = functions.parseLocationAddress(location.hash);
            if (window.addressParsed.length > 0){
                if (window.addressParsed[0].actualAddress == null){
                    if (window.addressParsed[0].publicAddress != null){
                        //assume the publicAddress is actually an ipns address
                        window.addressParsed[0].actualAddress = '/ipns/' + window.addressParsed[0].publicAddress;
                    }
                }
                if (window.addressParsed[0].actualAddress == 'options') {
                    handlePage(window.addressParsed[0].actualAddress)(null);
                } else {
                    processPage(window.addressParsed[0].actualAddress, onPageLoad(window.addressParsed[0].actualAddress, 0));
                }
            }
        }
        

    }
}

document.addEventListener('DOMContentLoaded', function() {
    //loadPage(windowIpfsAddress);
    var smug = window.smug || {};
    smug.refreshThread = refresh.refreshThread;
    smug.refreshStatus = refresh.refreshStatus;
    smug.submitPost = post.submitPost;
    smug.createBoard = post.createBoard;
    smug.modOperation = modTools.modOperation;
    smug.saveMods = modTools.saveMods;
    smug.loadMods = modTools.loadMods;
    smug.getMods = modTools.getMods;
    smug.setNewBoardAddress = page.setNewBoardAddress;
    smug.setNewModAddress = page.setNewModAddress;
    smug.pageStatus = pageStatus;
    smug.loadPage = loadPage;
    smug.handlePage = handlePage;
    smug.newThreadCreated = newThreadCreated;
    smug.scrollToPost = functions.scrollToPost;
    smug.refreshPage = functions.refreshPage;
    smug.goHome = functions.goHome;
    //window.addressParsed = [];
    window.smug = smug;
    
    //loadPage(location.hash);
    loadPage();
}, false);

window.addEventListener('hashchange', loadPage, false);//TODO handle case where you change thread in the middle of a refresh



