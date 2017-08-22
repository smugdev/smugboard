var serverAddress = 'http://localhost';

function getAddress(){
    return serverAddress;
}

module.exports.serverAddress = serverAddress;
module.exports.getAddress = getAddress;
