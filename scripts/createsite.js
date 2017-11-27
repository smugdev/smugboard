var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3010;

if (process.argv.length < 4){
    console.error('node createsite.js <SERVER> <MOD>');
    process.exit();
}

var server = process.argv[2];
var mods = process.argv[3];

sio.sendPost(serverAddress + ':' + port, {
    mode: 'site',
    type: 'create',
    password: password,
    title: 'Smugchan',
    formats: ['png', 'jpg'],
    mods: [mods],
    server: server
}).then(console.log).catch(console.error);
