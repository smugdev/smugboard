var xhr = require('xhr');

//var nameServers = ['http://localhost:3005'];//TODO handle more than one of these
var nameServers = [];
//nameServers.push('http://localhost:3005');
nameServers.push(require('./settings.js').getAddress() + ':3005');

var slog = require('../common/slog.js');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

function loadActual(address, callback){
    xhr({
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
            callback(null);
        }
    });
}

function loadJsonObj(address, callback){ //deprecated
    console.log('loadJsonObj is deprecated.');
    if (nameServers.length > 0){
        var addressSplit = address.split('/');
        var addressActual = '/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1];
        /*var properties = {//TODO this doesn't need to be an object
            address: ('/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1])
        }*/
        if (addressSplit[addressSplit.length - 2] == 'ipns'){
            loadActual(nameServers[0] + '?address=' + addressActual, function(association){
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
            console.log(result);
            callback(result);
        });
    });
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

function sendPost(server, jsonObj, callback){
    console.log('Now sending: ');
    console.log(jsonObj);
    xhr.post({url: server, formData: jsonObj}, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        } else {
            if (callback) {
                callback(body);
            }
        }
    });
}

module.exports.nameServers = nameServers;
module.exports.loadJsonObj = loadJsonObj;
module.exports.getJsonObjFromAPI = getJsonObjFromAPI;
module.exports.sendPost = sendPost;

