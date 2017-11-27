var slog = require('../../common/slog.js');
var page = require('./page.js');
var functions = require('./functions.js');
var wrapperFuncs = require('../../common/wrapperfuncs.js');
var handler = require('../../common/inputhandler.js');

var secondsLeft = 30;
var pendingRefresh = false;
var refreshTimeout = null;

//after .last load
function mergeToClientInitial(wrapper){
    if (wrapper.last.data.info.mode === 'site'){
        //handle title bar
        //TODO
    } else if (wrapper.last.data.info.mode === 'board'){
        //handle the title bar and stuff, handle banners
    } else if (wrapper.last.data.info.mode === 'thread'){
        //do nothing(?)
    }
}

//after sLog load
function mergeToClientMidpoint(wrapper, addressObj){
    if (wrapper.last.data.info.mode === 'site'){
        //handle board list
        let sitePublicAddress;
        for (let address of addressObj) {
            if (address.mode === 'site') {
                sitePublicAddress = address.publicAddress;
            }
        }
        page.fillBoardlist(sitePublicAddress, wrapper.sLog);
    } else if (wrapper.last.data.info.mode === 'board'){
        //do nothing(?)
    } else if (wrapper.last.data.info.mode === 'thread'){
        //do nothing(?)
    }
}

//everything is loaded, and this is the endpoint
function mergeToClientEndpoint(id, wrappers, knownMods, addressObj, skipMerges){
    if (!skipMerges){
        if (wrappers[id].last.data.info.mode === 'site'){
            //display site
            page.setSiteHTML(addressObj);
            //page.setNavLinks(false, addressObj);
        } else if (wrappers[id].last.data.info.mode === 'board'){
            //display board, or catalog if addressParsed[addressParsed.length - 1].mode === 'catalog'
            if (addressObj[addressObj.length - 1].mode === 'catalog'){
                page.setCatalogHTML(addressObj);
            } else {
                page.setBoardHTML(addressObj);
            }
            page.setPostFormData(id);
            page.setNavLinks(false, addressObj);
            page.setHeader(wrappers, addressObj);
        } else if (wrappers[id].last.data.info.mode === 'thread'){
            //display thread
            page.setThreadHTML();
            page.setNavLinks(true, addressObj);
            page.setHeader(wrappers, addressObj);
            page.setPostFormData(id);
        }
    }

    if (wrappers[id].last.data.info.mode === 'site'){
        //display site
        let sitePublicAddress;
        for (let address of addressObj) {
            if (address.mode === 'site') {
                sitePublicAddress = address.publicAddress;
            }
        }
        return page.fillBoardlistTable(sitePublicAddress, id, wrappers);
    } else if (wrappers[id].last.data.info.mode === 'board'){
        //display board, or catalog if addressParsed[addressParsed.length - 1].mode === 'catalog'
        if (addressObj[addressObj.length - 1].mode === 'catalog'){
            return page.loadCatalog(id, wrappers, knownMods);
        } else {
            return page.loadBoard(id, wrappers, addressObj, knownMods);
        }
    } else if (wrappers[id].last.data.info.mode === 'thread'){
        //display thread
        return page.loadThread(null, id, wrappers, addressObj, knownMods, false, false).then(() => {
            refreshThread(id)();
            document.getElementById('update_thread').setAttribute('onclick', 'window.smug.forceRefresh("' + id + '")');
            if (addressObj[addressObj.length - 1].mode === 'post'){
                //TODO scroll to post
            }
            return;
        });
    }
}

function handleWrapperRecursive(addressObj, wrappers, index, skipMerges, knownMods, modsPending){
    if (modsPending == null) {
        modsPending = [];
    }
    if (knownMods == null) {
        knownMods = [];
    }
    let currentId = addressObj[index].actualAddress;
    let endpoint = false;
    
    return wrapperFuncs.pullWrapperStub(currentId, wrappers).then(() => {
        modsPending = modsPending.concat(wrapperFuncs.collectMods(wrappers[currentId].last.data.info.mods, wrappers));
        if (wrappers[currentId].last.data.info.mods != null) {
            knownMods = knownMods.concat(wrappers[currentId].last.data.info.mods);
        }
        addressObj[index].mode = wrappers[currentId].last.data.info.mode;
        if (!skipMerges) {
            mergeToClientInitial(wrappers[currentId]);
        }
        
        if (index === addressObj.length - 1){        
            //last item
            endpoint = true;
        } else if (wrappers[currentId].last.data.info.mode === 'board' && addressObj.length - 1 === index + 1 && addressObj[index + 1].publicAddress === 'catalog'){
            //catalog designator
            addressObj[index + 1].mode = 'catalog';
            endpoint = true;
        } else if (wrappers[currentId].last.data.info.mode === 'thread' && addressObj.length - 1 === index + 1){
            //next item is just the post #
            addressObj[index + 1].mode = 'post';
            endpoint = true;
        }
        
        let promises = [];
        promises.push(
            wrapperFuncs.loadWrapper(wrappers[currentId]).then(() => {
                return slog.calculateSLogPayloads(wrappers[currentId]);
            })
        );
        if (endpoint){
            promises = promises.concat(modsPending);
        }
        return Promise.all(promises);
        
    }).then(() => {
        if (!skipMerges) {
            mergeToClientMidpoint(wrappers[currentId], addressObj);
        }
        
        if (endpoint){
            return mergeToClientEndpoint(currentId, wrappers, knownMods, addressObj, skipMerges);
        } else {
            //something else left, continue recursing
            addressObj[index + 1].actualAddress = functions.findAssociation(addressObj[index + 1].publicAddress, wrappers[currentId].sLog);
            if (addressObj[index + 1].actualAddress == null) {
                return Promise.reject('Item not found: ' + addressObj[index + 1].publicAddress);
            } else {
                return handleWrapperRecursive(addressObj, wrappers, index + 1, skipMerges, knownMods, modsPending);
            }
        }
    });
    //.catch(console.error);
}


/*function refresh(id, knownMods, wrappers, addressObj){
    //Promise.all for wrappers[id] (use wrapperFuncs.pullWrapperStub -> loadWrapper) and for each mod of knownMods (use wrapperFuncs.collectMods)
    
    
    let modsPending = wrapperFuncs.collectMods(knownMods, wrappers);
    let threadId = null;
    for (let item of addressObj){
        if (item.mode === 'thread'){
            threadId = item.actualAddress;
        }
    }
    
    let promises = modsPending.concat();
    
    Promise.all(modsPending)
    //page.loadThread(null, threadId, wrappers, addressObj, knownMods, modMode, fromIndex, indexSeqno)
}*/

function forceRefresh(id){
    pendingRefresh = true;
    refreshThread(id)();
}

function queueRefresh(){
    secondsLeft = 5;
}

//function refreshThread(id, wrappers, knownMods, addressObj){
function refreshThread(id){
    /*let refreshData = {};
    refreshData.id = id; 
    refreshData.wrappers = wrappers;//use global?
    refreshData.knownMods = knownMods;
    refreshData.addressObj = addressObj;
    
    var smug = window.smug || {};
    smug.refreshData = refreshData;*/
    
    
    haltRefresh();
    let index = 0;
    for (let i = 0; i < window.smug.addressObj.length; i++){
        if (window.smug.addressObj[i].mode === 'thread'){
            index = i;
        }
    }
    
    return () => {
        if (secondsLeft === 0 || pendingRefresh){
            handleWrapperRecursive(window.smug.addressObj, window.smug.wrappers, index, true, window.smug.knownMods);
            //handleWrapperRecursive(addressObj, wrappers, index, true, knownMods);
            //refresh(id, knownMods, wrappers, addressObj);
            document.getElementById('update_secs').innerHTML = 'Updating...';
            secondsLeft = 30;
            pendingRefresh = false;
        } else {
            secondsLeft--;
            document.getElementById('update_secs').innerHTML = secondsLeft;
            refreshTimeout = window.setTimeout(refreshThread(id), 1000);
        }
    };
}

function haltRefresh(){
    clearTimeout(refreshTimeout);
}

module.exports.forceRefresh = forceRefresh;
module.exports.queueRefresh = queueRefresh;
//module.exports.refreshThread = refreshThread;
module.exports.handleWrapperRecursive = handleWrapperRecursive;
module.exports.haltRefresh = haltRefresh;
