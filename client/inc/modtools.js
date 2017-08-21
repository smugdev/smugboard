var slog = require('../../common/slog.js');

var modIdentities = [];

function modOperation(operation, disused, thread, postNo, callback){//TODO if you're multiple mods it puts the same action everywhere, which isn't good since it adds useless doubleups in all your mods (still works though)
    for (let mod of modIdentities){
        slog.getSLog(mod.address, 0, null, function(sLog){
            var formData = new FormData();
            formData.append('operation', operation);
            formData.append('mod', mod.address);
            formData.append('thread', thread);
            formData.append('postNo', postNo);
            formData.append('password', mod.password);
            
            var req = new XMLHttpRequest();
            if (callback) {
                req.onreadystatechange = function(){
                    console.log(req.responseText);
                    if (req.readyState == 4 && req.status == 200){
                        callback(req.responseText);
                    }
                };
            } 
            
            req.open('POST', sLog[sLog.length - 1].server);
            req.send(formData);
        }, null);
    }
    return false;
}

function saveMods(){
    //TODO implement authentication, PREFERABLY by working out a way to use the current nodes IPFS pub/priv keys directly
    modElements = document.getElementsByName('address');
    modPasswords = document.getElementsByName('password');//TODO check this is right
    
    modIdentities = [];//remove to let someone be multiple mods at once
    let i;
    for (i = 0; i < modElements.length; i++){
        modIdentities.push({address: '/ipns/' + modElements[i].value, password: modPasswords[i].value});
    }
    
    document.cookie = 'mods=' + JSON.stringify(modIdentities) + '; path=/';
}

function getCookie(cname) {
    var name = cname + '=';
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return '';
}

function loadMods(){
    let currentData = getCookie('mods');
    if (currentData != ''){
        modIdentities = JSON.parse(currentData);
    }
}

function getMods(){
    loadMods();
    return modIdentities;
}

module.exports.modOperation = modOperation;
module.exports.saveMods = saveMods;
module.exports.loadMods = loadMods;
module.exports.getMods = getMods;

