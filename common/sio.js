var request = require('request');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

var nameservers = [];
nameservers.push(require('./settings.js').serverAddress + ':3005');
var sitePassword = require('./settings.js').password;

var util = require('./util.js');

function genKey(keyName){
    return ipfs.key.gen(keyName, {type: 'rsa', size: '2048'});
}

function getKeys(){
    return ipfs.key.list();
}

function ipfsAddBuffer(buffer){
    return ipfs.util.addFromStream(buffer).then(result => {
        return result[result.length - 1].hash;
    });
}

function ipfsAddObject(object){
    return ipfsAddBuffer(Buffer.from(JSON.stringify(object), 'utf8')).then(hash => {
        return '/ipfs/' + hash;
    });
}

function ipfsNameObject(hash, filename){
    return ipfs.object.new('unixfs-dir').then(node => {
        return ipfs.object.patch.addLink(node.multihash, {
            name: filename,
            multihash: hash
        });
    }).then(result => {
        return '/ipfs/' + result._json.multihash + '/' + filename;
    });
}
//ipfs.object.new('unixfs-dir').then(node => {return ipfs.object.patch.addLink(node.multihash, {name: 'hurr.jpg', multihash: 'QmfT7z9atYSk1ymQjMMBtDbDv8prj67roAkFzn8MAeT2BA'})}).then(console.log).catch(console.error)

function ipfsPublishToKey(address, keyName){
    return ipfs.name.publish(address, {key: keyName});
}

function publishToNameservers(id, association, password){
    return new Promise((resolve, reject) => {
        let promises = [];
        let jsonObj = {
            address: id,
            association: association,
            password: password
        };
        for (let server of nameservers){
            promises.push(sendPost(server, jsonObj));
        }
        Promise.all(promises).then(() => {
            resolve('Published to all name servers.');
        }).catch(reject);
    });
}

function ipfsPublish(address, keyName, pubkey){
    console.log('Publishing ' + address + ' to ' + keyName + ' (' + pubkey + ')');

    publishToNameservers(pubkey, address, sitePassword).then(resp => console.log).catch(err => console.error);
    
    ipfsPublishToKey(address, keyName).then(resp => console.log).catch(err => console.error);
}

function resolveFromSingleNameserver(nameserver, address){
    return new Promise((resolve, reject) => {
        let requestAddress = nameserver + '?address=' + address;
        loadAddress(requestAddress).then(resolve).catch(reject);
    });
}

function resolveFromNameservers(nameservers, address){
    return new Promise((resolve, reject) => {
        if (nameservers.length < 1) {
            reject('No nameservers.');
        }
        let promises = [];
        for (let nameserver of nameservers){
            promises.push(resolveFromSingleNameserver(nameserver, address).then(resolve));
        }
        Promise.all(promises).catch(reject);
        // TODO The logic is supposed to be be "return the first nameserver that resolves, and if none of them do then reject" - need to check the impl. here is right
        // TODO it's not right, promise.all will reject as soon as one of these fails. Fuck. Why can't Promise.race do normal shit
    });
}

function ipfsResolveName(address){
    return new Promise((resolve, reject) => {
        ipfs.name.resolve(address, (err, resolvedName) => {
            if (err) {
                reject(err);
            }
            resolve(resolvedName.Path);
        });
    });
}

function resolveName(address){
    return new Promise((resolve, reject) => {
        var addressSplit = address.split('/');// TODO ensure we can assume that the addresses will already be correct
        var addressActual = '/' + addressSplit[addressSplit.length - 2] + '/' + addressSplit[addressSplit.length - 1];
        if (addressSplit[addressSplit.length - 2] === 'ipns'){
            resolveFromNameservers(nameservers, addressActual).then(resolve).catch(err => {
                console.error(err);
                ipfsResolveName(addressActual).then(resolve).catch(reject);
            });
        } else {
            resolve(addressActual);
        }
    });
}

function ipfsGetJsonObject(address){
    return new Promise((resolve, reject) => {
        ipfs.files.cat(util.hashFromAddress(address)).then(stream => {
            let result = '';
            stream.on('data', (chunk) => {
                result += chunk;
            });
            stream.on('end', () => {
                resolve(JSON.parse(result));
            });
        }).catch(reject);
    });
}

function getJsonObject(address){
    return resolveName(address).then(addressActual => {
        return ipfsGetJsonObject(addressActual);
    });
}

function loadAddress(address){
    return new Promise((resolve, reject) => {
        request({
            uri: address,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (err, resp, body) => {
            if (resp != null && resp.statusCode === 200){
                if (resp.body != null){
                    resolve(resp.body);
                } else {
                    reject('Invalid response: ' + resp);
                }
            } else {
                reject(err);
            }
        });
    });

}

function sendPost(server, jsonObj){
    return new Promise((resolve, reject) => {
        request.post({url: server, formData: jsonObj}, (err, httpResponse, body) => {
            if (err) {
                reject(err);
            }
            resolve(body);
        });
    });
}


module.exports.genKey = genKey;
module.exports.getKeys = getKeys;
module.exports.ipfsAddBuffer = ipfsAddBuffer;
module.exports.ipfsAddObject = ipfsAddObject;
module.exports.ipfsNameObject = ipfsNameObject;
module.exports.ipfsPublish = ipfsPublish;
module.exports.resolveName = resolveName;
module.exports.getJsonObject = getJsonObject;
module.exports.sendPost = sendPost;

