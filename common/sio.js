var fs = require('fs');
var child_process = require('child_process');
var request = require('request');
var tmp = require('tmp');
var mv = require('mv');
var mkdirp = require('mkdirp');

var tmpDir = '/tmp';

var slog = require('../common/slog.js');

var nameServers = [];
//nameServers.push('http://localhost:3005');
nameServers.push(require('./settings.js').serverAddress + ':3005');
var sitePassword = require('../common/settings.js').password;
//var serverAddress = sio.loadObject('settings.json').serverAddress;//TODO sio_browser can't do this, switch to the settings.js thing

//TODO swap to actual api
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const dagPB = require('ipld-dag-pb'); //TODO get rid of this stupid dependency
//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

/*function loadJsonObj(address, callback){ 
    var req = new XMLHttpRequest();
    //req.overrideMimeType("application/json");
    req.open('GET', address, true);
    req.onreadystatechange = function () {
        if (req.readyState == 4 && req.status == "200") {
            callback(req.responseText);
        } 
    };
    req.send(null);  
};*/


function loadAll(obj, dir, callback){
    fs.readdir(dir, function(err, files){
        //console.log(files)
        if (files != null){
            for (let file of files){
                //console.log(file)
                fs.readFile(dir + '/' + file, 'utf8', function(err, data){
                    obj[file.split('.')[0]] = JSON.parse(data);
                    if (callback) {
                        callback();
                    }
                });
            }
        } else {
            callback(null);
        }
    });
}

function shellEscape(arg){
    console.log('shellEscape is deprecated.');
    //TODO ...check this is actually right. get someone smart to look at it. if it's wrong it'd be trivial to take over a server
    return '"'+arg.replace(/(["'$`\\])/g,'\\$1')+'"';
}

function filenameEscape(arg){
    console.log('filenameEscape is deprecated.');
    return arg.replace(/([/])/g,'\\$1');
}

//in theory this should work, but ipns-pub is having a bitch about the encoding. this is probably worth taking another look at at some point
/*function genKey(callback, bitsize){
    var sizeString = "";
    if (bitsize != null)
        sizeString = "-bitsize " + bitsize;
    
    child_process.exec("ipfs-key " + sizeString, (error, stdout, stderr) => {
        var pubkey = stderr.split(" ");
        //(pubkey, privkey)
        callback(pubkey[pubkey.length - 1].trim(), stdout.trim());
    });
}*/

function genKey(keyName, callback){
    ipfs.key.gen(keyName, {type: 'rsa', size: '2048'}, (err, resp) => {
        if (err) {
            console.log(err);
        }
        callback(resp.Id);
    });
}

//deprecated
function genKeyOld2(keyName, callback){
    console.log('genKeyOld2 is deprecated.');
    child_process.exec('IPFS_PATH=../.ipfs ipfs key gen --type=rsa --size=2048 ' + keyName, (error, stdout, stderr) => {//TODO change to arg arr ver.
        if (error){
            console.log(error);
            console.log(stderr);
        }
        var pubkey = stdout.trim();
        //console.log("pubkey is " + pubkey);
        callback(pubkey);
    });
}

//deprecated
function genKeyOld(callback, bitsize){
    console.log('genKeyOld is deprecated.');
    var sizeString = '';
    if (bitsize != null) {
        sizeString = ' -bitsize ' + bitsize;
    }
        
    var tmpName = tmp.tmpNameSync({ template: tmpDir + '/tmp-XXXXXX' });//TODO should be async, it's a callback thing anyway
    
    child_process.exec('ipfs-key' + sizeString + ' > ' + tmpName, (error, stdout, stderr) => {//TODO change to arg arr ver.
        var pubkeyArr = stderr.split(' ');
        var pubkey = pubkeyArr[pubkeyArr.length - 1].trim();
        mv(tmpName, 'keys/' + pubkey + '.key', {mkdirp: true}, function(err) {
            callback(pubkey); 
        });
    });
}

function sendPost(server, jsonObj, callback){
    //console.log('Now sending: ');
    //console.log(jsonObj);
    request.post({url: server, formData: jsonObj}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            console.log('upload failed:', err);
        } else {
            if (callback) {
                callback(body);
            }
        }
    });
}

/*function sendObject(server, jsonObj){
    
    var formData = { 
        thread: jsonObj.thread,
        board: jsonObj.board
    };
    request.post({url: server, formData: formData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);
    });
}*/

function loadActual(address, callback){//TODO deprecate this
    request({
        uri: address,
        headers: {
            'Content-Type': 'application/json'
        }
    }, function (err, resp, body) {
        // check resp.statusCode 
        if (resp != null && resp.statusCode == '200'){
            if (resp.body != null){
                callback(resp.body);
            } else {
                console.log('Invalid response:');
                console.log(resp);
                callback(null);
            }
        } else {
            console.log(err);
            callback(null);//TODO make sure everything can handle the null (pretty sure it crashes and burns right now in that case)
        }
    });
}

function loadJsonObj(address, callback){
    console.log('loadJsonObj is deprecated.');
    if (nameServers.length > 0){
        var addressSplit = address.split('/');
        var addressActual = '/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1];
        /*var properties = {//TODO this doesn't need to be an object
            address: ('/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1])
        }*/
        if (addressSplit[addressSplit.length - 2] == 'ipns'){
            loadActual(nameServers[0] + '?address=' + addressActual, function(association){
                console.log(association);
                if (association != null){
                    if (addressSplit.length > 3) {
                        association = addressSplit[0] + '//' + addressSplit[2] + association;
                    }
                    loadActual(association, callback);
                } else {
                    loadActual(address, callback);
                }
            });
        } else {
            loadActual(address, callback);
        }
    } else {
        loadActual(address, callback);
    }
}

function getJsonFromAPIActual(address, callback){
    ipfs.files.cat(address, (err, stream) => {
        if (err) {
            console.log(err);
        }
        let result = '';
        stream.on('data', (chunk) => {
            result += chunk;
        });
        stream.on('end', () => {
            //console.log(result);
            callback(result);
        });
    });
    
    /*ipfs.object.get(address, (err, node) => {
        if (err) {
            console.log(err);
        }
        let strObj = node.data.toString();
        while (strObj.charAt(0) != '{'){//TODO this is NOT the right way of doing this
            strObj = strObj.substring(1);
            console.log(strObj);
        }
        while (strObj.charAt(strObj.length - 1) != '}'){
            strObj = strObj.slice(0, -1);console.log(strObj);
        }
        
        
        callback(strObj);//TODO should really return an actual JSON obj
//        console.log(node.toJSON().multihash);
    });*/
}

function resolveNameFromAPI(address, callback){
    ipfs.name.resolve(address, (err, resolvedName) => {
        if (err) {
            console.log(err);
        }
        callback(resolvedName.Path);
    });
}

function getJsonObjFromAPI(address, callback){
    var addressSplit = address.split('/');
    var addressActual = '/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1];
    if (addressSplit[addressSplit.length - 2] == 'ipns'){
        if (nameServers.length > 0){
            loadActual(nameServers[0] + '?address=' + addressActual, function(association){
                if (!association){
                    resolveNameFromAPI(address, (resolvedName) => {
                        getJsonFromAPIActual(slog.hashFromAddress(resolvedName), callback);
                    });
                } else {
                    getJsonFromAPIActual(slog.hashFromAddress(association), callback);
                }
            });
        } else {
            resolveNameFromAPI(address, (resolvedName) => {
                getJsonFromAPIActual(slog.hashFromAddress(resolvedName), callback);
            });
        }
    } else {
        getJsonFromAPIActual(slog.hashFromAddress(address), callback);
    }
}

/*function loadJsonObj(address, callback){ 
    request({
        uri: address,
        headers: {
            "Content-Type": "application/json"
        }
    }, function (err, resp, body) {
        // check resp.statusCode
        if (resp != null && resp.statusCode == "200"){
            callback(resp.body);
        }
    });
};*/

function loadObject(filename){
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function loadObjectIfExists(filename, obj){
    try {
        fs.accessSync(filename, fs.F_OK);
        return loadObject(filename);
    } catch (e) {
        return null;
    }
}

function saveObject(filename, jsonObj){
    var pathArr = filename.split('/');
    if (pathArr.length > 1){
        var path = '';
        for (let i = 0; i < pathArr.length - 1; i++){
            path += pathArr[i];
        }
        mkdirp.sync(path);
    }
    
    fs.writeFileSync(filename, JSON.stringify(jsonObj), 'utf8');
}

function saveObjectAsync(filename, jsonObj, callback){//TODO need to make sure the same file isn't written to twice at once
    var pathArr = filename.split('/');
    if (pathArr.length > 1){
        var path = '';
        for (let i = 0; i < pathArr.length - 1; i++){
            path += pathArr[i];
        }
        mkdirp(path, function(){
            fs.writeFile(filename, JSON.stringify(jsonObj), 'utf8', callback);
        });
    } else {
        fs.writeFile(filename, JSON.stringify(jsonObj), 'utf8', callback);
    }
}

/*function saveString(filename, string){
    fs.writeFileSync(filename, string, 'utf8');
}*/

//TODO every add should be going through here
function ipfsAddBuffer(buffer, callback){
    //console.log('something is using proper api ver.')
    //console.log(callback)
    ipfs.util.addFromStream(buffer, (err, result) => {
        if (err) {
            console.log(err);
        }
        //console.log(result[result.length - 1]);
        callback(result[result.length - 1]);
    });
}

//deprecated
function ipfsAddBufferOld(buffer, callback){
    console.log('ipfsAddBufferOld is deprecated.');
    ipfs.util.addFromStream(buffer, (err, result) => {
        if (err) {
            
            //console.log(err);
            //console.error(err);
            //throw err;
        }//console.error(buffer)
        console.log(result[result.length - 1].hash);
        callback(result[result.length - 1].hash);
    });
}

function ipfsAddJson(jsonObj, callback){
    //console.log('from within jsonadd')
    //console.log(jsonObj)
    ipfsAddBuffer(Buffer.from(JSON.stringify(jsonObj)), (result) => {
        //console.error(result);
        callback(slog.ensureHashIpfs(result.hash));//TODO this shouldn't be necessary
    });
}

//deprecated
function ipfsAddSync(jsonObj){
    console.log('ipfsAddSync is deprecated.');
    return '/ipfs/' + child_process.execSync('ipfs add -q --pin=false ', {input: JSON.stringify(jsonObj)}).toString().trim();
}

//deprecated
function ipfsAdd(jsonObj, callback){
    console.log('ipfsAdd is deprecated.');
    tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
        if (err) {
            throw err;
        }
        saveObject(path, jsonObj);
        child_process.execFile('ipfs', ['add', '-q', '--pin=false', path], (error, stdout, stderr) => {
            console.log(stdout);
            console.log(stderr);
            callback('/ipfs/' + stdout.trim());
            cleanupCallback();
        });
    });
}

/*function ipfsAddSyncFs(filename){
    console.log('something is still using the sync ver.')
    return '/ipfs/' + child_process.execFileSync("ipfs", ['add', '-q', '--pin=false', filename]).toString().trim();
};*/

//deprecated
function ipfsPublishToDaemon(address){
    console.log('ipfsPublishToDaemon is deprecated.');
    //publish to whatever daemon is running locally
    child_process.execFile('ipfs', ['name', 'publish', address], (error, stdout, stderr) => {
        //console.log(stdout.trim());
    });
}

function ipfsPublishToKey(address, keyName){
    ipfs.name.publish(address, {key: keyName}, (err, resp) => {
        if (err) {
            console.log(err);
        }
        console.log(resp);
    });
}

//deprecated
function ipfsPublishToKeyOld(address, keyName){
    console.log('ipfsPublishToKeyOld is deprecated.');
    //publish to a specific key
    /*child_process.execFile("ipns-pub", ["--key", keyfile, address], (error, stdout, stderr) => {
        console.log(stdout, stderr);
    });    */
    child_process.exec('IPFS_PATH=../.ipfs ipfs name publish --key=' + keyName + ' ' + address, (error, stdout, stderr) => {//TODO change to arg arr ver.
        console.log(stdout, stderr);
    });
}

function ipfsPublish(address, keyName, pubkey){
    console.log('Publishing ' + address + ' to ' + keyName + ' (' + pubkey + ')');
    if (nameServers.length > 0){//TODO refactor to own function
        for (let server of nameServers){
            var nameAddress = '/ipns/';
            if (keyName == null) {
                nameAddress += 'QmLocalNodeIPFSID';
            }//TODO //actually no, deprecated
            else {
                nameAddress += pubkey;
            }//keyFile.split('/')[1].split('.')[0];
            var jsonObj = {
                address: nameAddress,
                association: address,
                password: sitePassword
            };
            sendPost(server, jsonObj);
        }

    }
    
    if (keyName == null)
    //use the local daemon
    {
        ipfsPublishToDaemon(address);
    }//deprecated
    else
    //use that key
    {
        ipfsPublishToKey(address, keyName);
    }
}

//deprecated
function ipfsPublishAll(obj){
    /*for (let item in obj){
        if (obj.hasOwnProperty(item)){
            if (obj[item].lastAddress != null){
                ipfsPublish(obj[item].lastAddress, 'keys/' + item + '.key');
            } else {
                console.log('did not publish ' + item);
            }
        }
    }*/
    console.log('ipfsPublishAll is deprecated');
}

//deprecated
function ipfsPatchAddSync(origObject, childAddress, filename){
    //var command = "ipfs object patch add-link " + origObject + " " + shellEscape(filename) + " " + childAddress;
    console.log('ipfsPatchAddSync is deprecated.');
    return '/ipfs/' + child_process.execFileSync('ipfs', ['object', 'patch', 'add-link', origObject, filename, childAddress]).toString().trim() + '/' + filename;
}

//deprecated
function ipfsNameObjectSync(childAddress, filename){
    console.log('ipfsNameObjectSync is deprecated.');
    return ipfsPatchAddSync('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn', childAddress, filename);
}

function ipfsPatchAdd(origMultihash, childLink, callback){
    ipfs.object.patch.addLink(origMultihash, childLink, (err, patchedNode) => {
        if (err) {
            console.log(err);
        }
        callback(patchedNode);
    });
}

function ipfsNameObject(childObj, filename, callback){
    ipfs.object.new('unixfs-dir', (err, node) => {
        if (err) {
            console.log(err);
        }
        let childLink = new dagPB.DAGLink(filename, childObj.size, childObj.hash);
        
        ipfsPatchAdd(node.multihash, childLink, (patchedNode) => {
            callback('/ipfs/' + patchedNode.toJSON().multihash + '/' + filename);
        });
    });
}

module.exports.nameServers = nameServers;
module.exports.loadAll = loadAll;
module.exports.genKey = genKey;
module.exports.sendPost = sendPost;
module.exports.loadObject = loadObject;
module.exports.loadObjectIfExists = loadObjectIfExists;
module.exports.saveObject = saveObject;
module.exports.saveObjectAsync = saveObjectAsync;
//module.exports.saveString = saveString;
module.exports.sendPost = sendPost;
//module.exports.sendObject = sendObject;
module.exports.loadJsonObj = loadJsonObj;
module.exports.getJsonObjFromAPI = getJsonObjFromAPI;
module.exports.ipfsAddBuffer = ipfsAddBuffer;
//module.exports.ipfsAddBufferOld = ipfsAddBufferOld;//TODO need to remove this line and replace with the one above
module.exports.ipfsAddJson = ipfsAddJson;
//module.exports.ipfsAddSync = ipfsAddSync;
//module.exports.ipfsAdd = ipfsAdd;
//module.exports.ipfsAddSyncFs = ipfsAddSyncFs;
module.exports.ipfsPublish = ipfsPublish;
module.exports.ipfsPublishAll = ipfsPublishAll;
module.exports.ipfsPatchAdd = ipfsPatchAdd;
//module.exports.ipfsPatchAddSync = ipfsPatchAddSync;
module.exports.ipfsNameObject = ipfsNameObject;
//module.exports.ipfsNameObjectSync = ipfsNameObjectSync;

