var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3010;

if (process.argv.length < 4){
    console.error('node addthreadtoboard.js <BOARD> <THREAD>');
    process.exit();
}

var board = process.argv[2];
var thread = process.argv[3];

sio.sendPost(serverAddress + ':' + port, {
    mode: 'board',
    type: 'add',
    password: password,
    id: board,
    newaddress: thread
}).then(console.log).catch(console.error);

