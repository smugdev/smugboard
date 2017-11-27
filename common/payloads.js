var sio = require('./sio.js');
var imgDims = require('image-size');//TODO presently this package doesn't work with browserify - good luck fixing that one
//TODO consider instead making the client work out the dimensions

function processSingleFile(fileInfo, formats, previewable){
    return new Promise((resolve, reject) => {
        console.log(fileInfo);
        if (fileInfo != null && fileInfo.buffer != null){
            let file = {};
            file.filename = fileInfo.originalname;
            let filenameSplit = fileInfo.originalname.split('.');
            file.extension = filenameSplit[filenameSplit.length - 1];
            file.size = fileInfo.size;
            
            if (formats.indexOf(file.extension) !== -1){                
                sio.ipfsAddBuffer(fileInfo.buffer).then(fileHash => {
                    return sio.ipfsNameObject(fileHash, fileInfo.originalname);
                }).then(fileAddress => {
                    file.address = fileAddress;
                    
                    let fileDims = null;
                    if (previewable.indexOf(file.extension) !== -1){
                        try {
                            fileDims = imgDims(fileInfo.buffer);
                        } catch (err){
                            reject('Getting image dims failed: ' + err);
                        }
                    }
                    if (fileDims != null){
                        file.height = fileDims.height;
                        file.width = fileDims.width;
                    }
                    
                    resolve(file);
                }).catch(reject);
            } else {
                reject('Invalid filetype.');
            }
        } else {
            reject('Invalid file data.');
        }
    });
}

function processFiles(filesInfo, formats, previewable){
    return new Promise((resolve, reject) => {
        let fileProcessors = [];
        for (let fileInfo of filesInfo){
            if (fileInfo != null){
                fileProcessors.push(processSingleFile(fileInfo, formats, previewable));
            }
        }
        Promise.all(fileProcessors).then(values => { //Promise.all is so fucking cool, I should've used this a long time ago
            resolve(values);
        }).catch(reject);
    });
}

function getThreadPayload(msg, filesInfo, formats, previewable){
    return new Promise((resolve, reject) => {
        let payload = {author: '', email: '', subject: '', body: ''};
        if (msg.author) {
            payload.author = msg.author;
        }
        if (msg.email) {
            payload.email = msg.email;
        }
        if (msg.subject) {
            payload.subject = msg.subject;
        }
        if (msg.body) {
            payload.body = msg.body;
        }
        
        processFiles(filesInfo, formats, previewable).then(files => {
            payload.files = files;
            return sio.ipfsAddObject(payload);
        }).then(payloadAddress => {
            resolve({data: {post: {address: payloadAddress}}});
        }).catch(reject);
    });
}

function getBoardPayload(msg){
    return new Promise((resolve, reject) => {
        let payload = {data: {thread: {address: ''}}};
        if (msg.newaddress) {
            payload.data.thread.address = msg.newaddress;
        } //TODO verify this is a valid IPNS name, and perhaps that it points to a valid thread wrapper? or doing it client side would work too probably
        
        resolve(payload);
        //sio.ipfsAddObject(payload).then(payloadAddress => {
        //resolve(payloadAddress);
        //}).catch(reject);
    });
}

function getSitePayload(msg){
    return new Promise((resolve, reject) => {
        let payload = {data: {}};
        if (msg.newaddress) {
            payload.data.address = msg.newaddress;
        } else {
            reject('Missing address of board to attach.');
        }
            
        if (msg.uri) {
            payload.data.uri = msg.uri;
        } else {
            reject('Missing uri to assign board to.');
        }
        
        resolve(payload);
        //sio.ipfsAddObject(payload).then(payloadAddress => {
        //    resolve(payloadAddress);
        //}).catch(reject);
    });
}

function getModPayload(msg){
    return new Promise((resolve, reject) => {
        let payload = {data: {}};
        if (msg.target) {
            payload.data.target = msg.target;
        } else {
            reject('Missing address of post to apply action to.');
        }
            
        if (msg.operation) {
            payload.data.operation = msg.operation;
        } else {
            reject('Missing operation type.');
        }
            
        if (msg.content) {
            payload.data.content = msg.content;
        }
        
        resolve(payload);
        //sio.ipfsAddBuffer(JSON.stringify(payload)).then(payloadAddress => {
        //    resolve(payloadAddress);
        //}).catch(reject);
    });
}


module.exports.getThreadPayload = getThreadPayload;
module.exports.getBoardPayload = getBoardPayload;
module.exports.getSitePayload = getSitePayload;
module.exports.getModPayload = getModPayload;
