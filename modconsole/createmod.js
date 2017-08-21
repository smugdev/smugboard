var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').getAddress();
var port = 3004;
//process.argv[2]

sio.sendPost(serverAddress + ':' + port, {
    title: 'Hotpockets',
    password: 'myverysecurepassword',
    admin: 'true',
    operation: 'new'
}, console.log);

