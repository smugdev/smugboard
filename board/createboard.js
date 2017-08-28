var sio = require('../common/sio.js');
var serverAddress = require('../common/settings.js').getAddress();
var port = 3001;

if (process.argv.length < 5){
    console.log('node createboard.js [modaddress] [threadserveraddress] [boardname]');
    process.exit();
}

var mods = [process.argv[2]];
var threadServers = [process.argv[3]];
var boardName = [process.argv[4]];

sio.sendPost(serverAddress + ':' + port, {
    title: boardName,
    mods: mods,
    banners: [],
    fileFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'webm', 'mp4', 'mp3', 'ogg', 'flac', 'apng', 'pdf', 'iso', 'zip', 'tar', 'gz', 'rar', '7z', 'torrent'],
    threadServers: threadServers,
    admin: 'true',
    operation: 'new'
}, console.log);

