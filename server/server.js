var express = require('express');
var app = express();
var multer  = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
var serverAddress = require('../common/settings.js').serverAddress;
var port = 3010; //0 makes the program just pick something free

var handler = require('../common/inputhandler.js');

var globalWrappers = {};

//http server entry
app.post('/', upload.single('file'), function (req, res, next) { //TODO work out what next is for
    console.log('Post received: ' + JSON.stringify(req.body));
    //console.log(req);
    //console.log(req.file);
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.body) {
        handler.handleInput(globalWrappers, req.body, [req.file], req.connection.remoteAddress, serverAddress).then(obj => {
            console.log(obj);
            if (obj.status == null) {
                res.send(obj.result);
            } else {
                res.status(obj.status).send(obj.result);
            }
        }).catch(obj => {
            console.error(obj);
            if (obj.status == null) {
                res.send(obj.result);
            } else {
                res.status(obj.status).send(obj.result);
            }
        });
    } else {
        res.status(400).send('Malformed POST (missing body).');
    }
});

var listener = app.listen(port, function(){
    serverAddress += ':' + listener.address().port;
    handler.setupServer(globalWrappers).then(() => {
        console.log('Now listening on ' + listener.address().port);
    }).catch(console.error);
});
