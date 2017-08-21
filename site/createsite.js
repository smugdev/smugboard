var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').getAddress();
var port = 3003;

if (process.argv.length < 3){
    console.log('node createsite.js [modaddress]');
    process.exit();
}

var mods = [process.argv[2]];

sio.sendPost(serverAddress + ':' + port, {
    title: 'Smugchan',
    mods: mods,
    banners: ['/ipfs/QmX5ynLaZtoryMC8pRRgU88QCPHAxhUoh8M1yu8B4JQcP3/banner.jpg'],
    admin: 'true',
    operation: 'new'
}, console.log);

