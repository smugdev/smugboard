function parseLocationAddress(windowAddress){
    windowAddress = windowAddress.replace(/^#/, '');
    var addressInternals = [];
    
    addressArr = windowAddress.split('/');
    
    for (let i = 0; i < addressArr.length; i++){
        if (addressArr[i] == ''){
            //do nothing
        } else if (addressArr[i] == 'ipns' || addressArr[i] == 'ipfs'){
            addressInternals.push({
                actualAddress: '/' + addressArr[i] + '/' + addressArr[i+1],
                publicAddress: '/' + addressArr[i] + '/' + addressArr[i+1]
            });
            i++;
        } else {
            addressInternals.push({
                publicAddress: addressArr[i]
            });
        }
    }
    
    return addressInternals;
}

function getNewHash(addressParsed, unwantedModes, extra){
    if (unwantedModes == null) {
        unwantedModes = [];
    }
        
    var newHash = '#';
    for (let item of addressParsed){
        if (item.mode != null && unwantedModes.indexOf(item.mode) == -1){
            if (newHash == '#'){
                newHash += item.publicAddress;
            } else {
                newHash += '/' + item.publicAddress;
            }
        }
    }
    
    if (extra != null) {
        newHash += '/' + extra;
    }
    
    return newHash;
}

function scrollToCurrentPost(){
    let targetID = location.hash.replace(/^#/, '');
    let target = document.getElementById(targetID);
    if (target != null) {
        document.body.scrollTop = target.offsetTop;
    }
}

function refreshPage(){
    location.reload(true);
}

function goHome(){
    //getNewHash(window.addressParsed, ['options', 'manage', 'create'])
    
    var newHash = '#';
    for (let item of window.addressParsed) {
        if (item.mode != null) {
            if (item.mode == 'site')//TODO should use functions.getNewHash()
            {
                newHash += '/' + item.publicAddress;
            }
        }
    }
    location.hash = newHash;
}

module.exports.parseLocationAddress = parseLocationAddress;
module.exports.getNewHash = getNewHash;
module.exports.scrollToCurrentPost = scrollToCurrentPost;
module.exports.refreshPage = refreshPage;
module.exports.goHome = goHome;


