var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3010;

sio.sendPost(serverAddress + ':' + port, {
    mode: 'server',
    type: 'create',
    password: password,
    title: 'Server-chan'
}).then(console.log).catch(console.error);
