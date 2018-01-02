var wrapperFuncs = require('../../common/wrapperfuncs.js');
var inputHandler = require('../../common/inputhandler.js');

//TODO track local servers
var localWrappers = {};//should this perhaps just be integrated into the standard wrapper construct? perhaps with wrappers[id].local == true ?

function isLocalServer(serverId){
    if (localWrappers[serverId] != null){
        return true;
    } else {
        return false;
    }
}

function sendToRemoteServer(serverId, wrappers, formData){
    return new Promise((resolve, reject) => {
        wrapperFuncs.getServerConn(serverId, wrappers).then(conn => {//TODO just return this?
            let req = new XMLHttpRequest();//TODO try transitioning this to the xhr library, don't know if doable with files
            req.onreadystatechange = () => {
                if (req.readyState === XMLHttpRequest.DONE) {
                    resolve(req.responseText);//TODO should resolve an obj with the same format as from inputHandler
                }
            };
            req.addEventListener('error', err => {
                reject(err);
            });
            req.open('POST', conn.ip);
            req.send(formData);
        }).catch(reject);
    });
}

function sendToLocalServer(){
    //TODO
    let reader = new FileReader();
    return inputHandler.handleInput(localWrappers, msg, file, remoteAddress, serverAddress);
}

function objToFormData(obj){//TODO move to functions
    let formData = new FormData();
    for (let item in obj){
        formData.set(item, obj[item]);
    }
    return formData;
}

function sendToServer(serverId, wrappers, formObj){
    //determine if the server is local to the current browser
    if (isLocalServer(serverId)){
        //if so, send to the local server
        return sendToLocalServer();
    } else {
        //if not, send to the remote server
        let formData = objToFormData(formObj);
        return sendToRemoteServer(serverId, wrappers, formData);
    }
}

module.exports.sendToServer = sendToServer;
