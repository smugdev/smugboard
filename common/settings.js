var serverAddress = 'http://localhost';
//var serverAddress = 'http://107.189.34.58';

function getAddress(){
    return serverAddress;
}

module.exports.serverAddress = serverAddress;
module.exports.getAddress = getAddress;
