var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3010;

if (process.argv.length < 6){
    console.error('node createboard.js <SERVER> <MOD> <THREADSERVER> <TITLE>');
    process.exit();
}

var server = process.argv[2];
var mods = process.argv[3];
var threadServer = process.argv[4];
var title = process.argv[5];

sio.sendPost(serverAddress + ':' + port, {
    mode: 'board',
    type: 'create',
    password: password,
    title: title,
    formats: ['png', 'jpg'],
    mods: [mods],
    threadservers: [threadServer],
    server: server
}).then(console.log).catch(console.error);

