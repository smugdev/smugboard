var functions = require('./inc/functions.js');
//var pageHtml = require('./inc/pagehtml.js');
var page = require('./inc/page.js');
var post = require('./inc/post.js');
var controller = require('./inc/controller.js');
//var sio = require('../common/sio.js');

var globalWrappers = {};
var addressParsed = [];

function loadPage(){
    controller.haltRefresh();
    
    var newAddressParsed = functions.parseLocationAddress(location.hash);
    
    var isNewPage = false;
    if (addressParsed === []) {
        isNewPage = true;
        //TODO work out if we're on the same page
        //if the last item was a thread, and we've just added an extra item, then it's the same page
        //if the last item was a post, and we've just changed the item at that position, then it's the same page
        //otherwise it's a different page
    }
    isNewPage = true;
    
    if (isNewPage){
        //globalWrappers = {};//TODO get rid of this?
        
        page.setTemplateHTML();
        
        window.smug.addressObj = addressParsed = newAddressParsed;
        window.smug.knownMods = [];
        
        
        controller.handleWrapperRecursive(addressParsed, globalWrappers, 0, false, window.smug.knownMods);
    } else {
        //TODO scroll to element
    }
}

document.addEventListener('DOMContentLoaded', () => {
    var smug = window.smug || {};
    smug.submitPost = post.submitPost;
    smug.wrappers = globalWrappers;
    smug.addressObj = addressParsed;
    smug.forceRefresh = controller.forceRefresh;
    window.smug = smug;
    loadPage();
}, false);

window.addEventListener('hashchange', loadPage, false);
