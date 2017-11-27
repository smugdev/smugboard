var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3010;

if (process.argv.length < 5){
    console.error('node addboardtosite.js <SITE> <BOARD> <URI>');
    process.exit();
}

var site = process.argv[2];
var board = process.argv[3];
var uri = process.argv[4];

sio.sendPost(serverAddress + ':' + port, {
    mode: 'site',
    type: 'add',
    password: password,
    id: site,
    newaddress: board,
    uri: uri
}).then(console.log).catch(console.error);

