var fs = require('fs');
var wrappersFile = 'wrappers.json';

function saveObject(filename, obj){//TODO deprecate this
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, JSON.stringify(obj), (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

function saveWrappers(wrappers){
    //return new Promise((resolve, reject) => {
    return saveObject(wrappersFile, wrappers);//.then(resolve).catch(reject);
    //});
}

function loadObjectIfExists(filename){//TODO deprecate this, use something also browser-compatible
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

function getWrappers(){
    return new Promise((resolve, reject) => {
        loadObjectIfExists(wrappersFile).then((data) => {
            resolve(JSON.parse(data));
        }).catch(() => {
            resolve({});
        });
    });
}
module.exports.saveObject = saveObject;
module.exports.saveWrappers = saveWrappers;
module.exports.loadObjectIfExists = loadObjectIfExists;
module.exports.getWrappers = getWrappers;
