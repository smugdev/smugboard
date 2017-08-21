var sio = require('../../common/sio_browser.js');//TODO work out why browserfy isn't picking it up

function submitPost(formname, server, callback){
    var formData = new FormData( document.getElementById(formname));
    var req = new XMLHttpRequest();
    
    req.addEventListener('load', function(event) {
        //alert('Yeah! Data sent and response loaded.');
    });
    /*req.onreadystatechange = function () {
        if (req.readyState == 4 && req.status == '200') {
            //alert('Yeah! Data sent and response loaded.');
        } 
    };*/
    
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE) {
            console.log(req.responseText);//TODO remove
            if (callback != null) {
                callback(req.responseText);
            }
        }
    };
    /*// We define what will happen in case of error
    req.addEventListener('error', function(event) {
        //alert('Oups! Something goes wrong.');
    });*/ //don't care about reading the result
    
    req.open('POST', server);
    req.send(formData);
}

function createBoard(server, callback){
    submitPost('createform', server, callback);
    /*var formData = new FormData( document.getElementById('createform'));
    sio.sendPost(server, {
        title: formData.get('title'),
        mods: JSON.stringify(formData.getAll('mods[]')),
        banners: JSON.stringify(formData.getAll('banners[]')),
        fileFormats: JSON.stringify(formData.getAll('fileFormats[]')),
        threadServers: JSON.stringify(formData.getAll('threadServers[]')),
        admin: 'true',
        operation: 'new'
    }, callback);*/
}

/*function createBoard(callback){
    var formData = new FormData( document.getElementById('createform'));
    formData.set('admin', 'true');
    formData.set('operation', 'new');
    
    
    
    var req = new XMLHttpRequest();
    req.addEventListener('load', function(event) {
        //alert('Yeah! Data sent and response loaded.');
    });
    
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE) {
            console.log(req.responseText);//TODO remove
            if (callback != null)
                callback(req.responseText);
        }
    }
    
    //TODO should be pulling the boardserver ip from the network properly
    sio.sendPost('http://localhost:3001', {
        title: formData.get('title'),
        mods: JSON.stringify(formData.getAll('mods')),
        banners: JSON.stringify(formData.getAll('banners')),
        fileFormats: JSON.stringify(['jpg', 'png', 'gif']),
        threadServers: JSON.stringify(formData.getAll('tservers')),
        admin: 'true',
        operation: 'new'
    }, callback);
}*/

module.exports.submitPost = submitPost;
module.exports.createBoard = createBoard;

