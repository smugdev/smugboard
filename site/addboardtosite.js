var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').getAddress();
var port = 3003;

if (process.argv.length < 5){
    console.log('node addboardtosite.js [siteaddress] [boardaddress] [boarduri]');
    process.exit();
}

var site = [process.argv[2]];
var address = [process.argv[3]];
var uri = [process.argv[4]];

sio.sendPost(serverAddress + ':' + port, {
    site: site,
    uri: uri,
    address: address
}, console.log);

