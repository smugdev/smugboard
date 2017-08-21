function scrollToPost(arg1, arg2, arg3, arg4){
    var post = arg1;
    var thread = arg2;
    var board = arg3;
    var site = arg4;
    var newHashArr = [];
    var i;
    
    for (i = window.smug.addressParsed.length - 1; i >= 0 && i > window.smug.addressParsed.length - 5; i--){
        
    }
    
    for (let item of window.smug.addressParsed){
        if (item.mode != null){
            if (item.mode == 'site'){
                if (site == null) {
                    site = item.publicAddress;
                }
            } else if (item.mode == 'index'){
                
            }
        }
    }
}

module.exports.scrollToPost = scrollToPost;
