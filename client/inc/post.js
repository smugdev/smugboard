var wrapperFuncs = require('../../common/wrapperfuncs.js');
var util = require('../../common/util.js');
//var sio = require('../../common/sio.js');
var controller = require('./controller.js');
var bridge = require('./serverbridge.js');

function submitPost(wrapperId, wrappers, formName){
    
    //TODO grey out the button
    let formData = new FormData(document.getElementById(formName));
    let formKeys = formData.keys();
    let postData = {};
    
    for (let key of formKeys){
        postData[key] = formData.get(key);
    }


    if (postData.author === '') {
        postData.author = 'Anonymous';
    }
    postData.type = 'add';

    Promise.resolve().then(() => {
        if (!wrappers[wrapperId]){
            return wrapperFuncs.pullWrapperStub(wrapperId, wrappers);
        } else {
            return;
        }
    }).then(() => {
        //work out where we are
        if (!util.propertyExists(wrappers[wrapperId], 'last.data.info.mode')){
            Promise.reject('Not a valid object.');
        } else if (wrappers[wrapperId].last.data.info.mode === 'board'){
            //if we're at a board, we're creating a thread, posting to that thread, then posting that thread to a board server
            if (wrappers[wrapperId].last.data.info.threadservers && wrappers[wrapperId].last.data.info.threadservers.length > 0){
                //create a new thread
                let chosenServer = wrappers[wrapperId].last.data.info.threadservers[Math.floor(Math.random() * wrappers[wrapperId].last.data.info.threadservers.length)];
                let threadData = {
                    mode: 'thread',
                    type: 'create',
                    id: chosenServer,
                    server: chosenServer
                };
                
                return bridge.sendToServer(chosenServer, wrappers, threadData).then(threadAddress => {
                    let promises = [];
                    //post to that thread
                    postData.mode = 'thread';
                    postData.id = threadAddress;
                    promises.push(bridge.sendToServer(threadAddress, wrappers, postData));
                    
                    //simultaneously, add that thread to the board in question
                    let boardData = {
                        mode: 'board',
                        type: 'add',
                        id: wrapperId,
                        newaddress: threadAddress
                    };
                    promises.push(bridge.sendToServer(wrapperId, wrappers, boardData));
                    
                    Promise.all(promises).then(values => {
                        return values;
                    });
                });
            } else {
                Promise.reject('No server found.');
            }
        } else if (wrappers[wrapperId].last.data.info.mode === 'thread'){
            //if we're at a thread, we're posting to that thread's server.
            if (!wrappers[wrapperId].last.data.info.server){
                Promise.reject('No server found.');
            } else {
                postData.mode = wrappers[wrapperId].last.data.info.mode;
                postData.id = wrapperId;
                return bridge.sendToServer(wrappers[wrapperId].last.data.info.server, wrappers, postData).then(result => {
                    controller.queueRefresh();
                    return result;
                });
            }
        } else {
            Promise.reject('Can\'t post to that object');
        }
        
        //need to return the serverId we're using
    }).then(console.log).catch(console.error);
    
    //TODO ungrey the button
    
    //if we're at a board, we're posting to a thread server, then posting to a board server
    //send the post to the server at [actualAddress].last.data.info.threadservers, perhaps randomly selecting which
    //-> need to get the actual address of the thread server. it'd be nice if we already had it loaded
    //-> if a thread server fails, it might be good to go on to the next thread server? //yes, it'd be very good, almost a requirement in fact //TODO
    //create a new thread at that thread server
    //get back the address of the new thread then make the actual post to that thread
    //simultaneously, add the thread to the board server
    //once both are done, get back the assigned seqno, then add it to the parsed address stream, then refresh the page to there
    
    //if we're at a thread, we're posting to that thread server.
    //send the post to the server at [actualAddress].last.data.info.server
    //TODO get back the assigned seqno. if we have a 'post' in addressParsed, replace it. if we don't, add it to the address
    //TODO trigger page refresh, perhaps in ~3 seconds
    //TODO scroll to the post when the refresh is complete - which we should be tracking
}

module.exports.submitPost = submitPost;
