var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').serverAddress;
var password = require('../common/settings.js').password;
var port = 3004;
//process.argv[2]

sio.sendPost(serverAddress + ':' + port, {
    title: 'Hotpockets',
    password: password,
    admin: 'true',
    operation: 'new'
}, console.log);

