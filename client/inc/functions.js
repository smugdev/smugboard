var util = require('../../common/util.js');

function parseLocationAddress(windowAddress){
    windowAddress = windowAddress.replace(/^#/, '');
    var addressInternals = [];
    
    var addressArr = windowAddress.split('/');
    
    for (let i = 0; i < addressArr.length; i++){
        if (addressArr[i] === ''){
            //do nothing
        } else if (addressArr[i] === 'ipns' || addressArr[i] === 'ipfs'){
            addressInternals.push({
                actualAddress: '/' + addressArr[i] + '/' + addressArr[i+1],
                publicAddress: '/' + addressArr[i] + '/' + addressArr[i+1]
            });
            i++;
        } else if (addressInternals.length === 0) {
            //assume IPNS
            addressInternals.push({
                actualAddress: '/ipns/' + addressArr[i],
                publicAddress: addressArr[i]
            });
        } else {
            addressInternals.push({
                publicAddress: addressArr[i]
            });
        }
    }
    
    return addressInternals;
}

function getNewHash(addressParsed, unwantedModes, extras){
    if (unwantedModes == null) {
        unwantedModes = [];
    }
        
    var newHash = '#';
    for (let item of addressParsed){
        if (item.mode != null && unwantedModes.indexOf(item.mode) === -1){
            if (newHash === '#'){
                newHash += item.publicAddress;
            } else {
                newHash += '/' + item.publicAddress;
            }
        }
    }
    
    if (extras != null) {
        for (let item of extras) {
            newHash += '/' + item;
        }
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

function findAssociation(publicAddress, sLog){
    for (let entry of sLog){
        if (!entry.removed && util.propertyExists(entry, 'data.payload.data.thread.address') && entry.data.seqno){
        //if (!entry.removed && entry.data && entry.data.payload && entry.data.seqno && entry.data.payload.data && entry.data.payload.data.thread && entry.data.payload.data.thread.address){
            if (publicAddress === entry.data.seqno + ''){
                return entry.data.payload.data.thread.address;
            }
        }
        if (!entry.removed && util.propertyExists(entry, 'data.payload.data.uri')){
        //if (!entry.removed && entry.data && entry.data.payload && entry.data.payload.data && entry.data.payload.data.uri){
            if (publicAddress === entry.data.payload.data.uri){
                return entry.data.payload.data.address;
            }    
        }
    }
    return null;
}

module.exports.parseLocationAddress = parseLocationAddress;
module.exports.getNewHash = getNewHash;
module.exports.scrollToCurrentPost = scrollToCurrentPost;
module.exports.findAssociation = findAssociation;

