var wrapperFuncs = require('../../common/wrapperfuncs.js');
var util = require('../../common/util.js');
//var sio = require('../../common/sio.js');
var controller = require('./controller.js');

function sendToServer(serverId, wrappers, formData){
    return new Promise((resolve, reject) => {
        wrapperFuncs.getServerConn(serverId, wrappers).then(conn => {
            let req = new XMLHttpRequest();//TODO try transitioning this to the xhr library, don't know if doable with files
            req.onreadystatechange = () => {
                if (req.readyState === XMLHttpRequest.DONE) {
                    resolve(req.responseText);
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

function submitPost(wrapperId, wrappers, formName){
    
    //TODO grey out the button
    let formData = new FormData(document.getElementById(formName));
    if (formData.get('author') === '') {
        formData.set('author', 'Anonymous');
    }
    formData.set('type', 'add');
        
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
                let threadForm = new FormData();
                threadForm.set('mode', 'thread');
                threadForm.set('type', 'create');
                threadForm.set('id', chosenServer);
                threadForm.set('server', chosenServer);
                
                return sendToServer(chosenServer, wrappers, threadForm).then(threadAddress => {
                    let promises = [];
                    //post to that thread
                    formData.set('mode', 'thread');
                    formData.set('id', threadAddress);
                    promises.push(sendToServer(threadAddress, wrappers, formData));
                    
                    //simultaneously, add that thread to the board in question
                    let boardForm = new FormData();
                    boardForm.set('mode', 'board');
                    boardForm.set('type', 'add');
                    boardForm.set('id', wrapperId);
                    boardForm.set('newaddress', threadAddress);
                    promises.push(sendToServer(wrapperId, wrappers, boardForm));
                    
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
                formData.set('mode', wrappers[wrapperId].last.data.info.mode);
                formData.set('id', wrapperId);
                return sendToServer(wrappers[wrapperId].last.data.info.server, wrappers, formData).then(result => {
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
