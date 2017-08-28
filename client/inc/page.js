var functions = require('./functions.js');
var slog = require('../../common/slog.js');
//var sio = require('../../common/sio.js'); TODO this should automatically work
var sio = require('../../common/sio_browser.js');
var pageHtml = require('../../common/page_html.js');
var threadServer = require('../../common/current_thread.js').serverAddress;

//things embeddable in <img> tags
//must only contain things that image-size is dealing with in threadmanager.js
var browserDisplayableFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico'];

function decoratePostBody(bodyRaw, indexSeqNo){
    let singleMatch;
    let bodyPretty = bodyRaw + '';
    
    bodyPretty = bodyPretty.replace(/\&/g, '&amp;');
    bodyPretty = bodyPretty.replace(/</g, '&lt;');
    bodyPretty = bodyPretty.replace(/>/g, '&gt;');
    bodyPretty = bodyPretty.replace(/(&gt;.*)(\r|\n|$)/g, '<span style=\'color:#789922\'>$1</span>$2');
    
    //TODO strikethrough
    bodyPretty = bodyPretty.replace(/\*\*(.*)\*\*/g, '<span class=\'spoiler\'>$1</span>');
    bodyPretty = bodyPretty.replace(/==(.*)==/g, '<span class=\'heading\'>$1</span>');
    bodyPretty = bodyPretty.replace(/'''(.*)'''/g, '<strong>$1</strong>');
    bodyPretty = bodyPretty.replace(/''(.*)''/g, '<em>$1</em>');
    
    let modes = ['site', 'index', 'reply', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;&gt;&gt;\/([a-z0-9][a-z0-9]*)\/([a-z0-9][a-z0-9]*)\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(window.addressParsed, modes, indexSeqNo) + '/$1/$2/$3/$4\'>>>>>>/$1/$2/$3/$4</a>');
    modes = ['index', 'reply', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;&gt;\/([a-z0-9][a-z0-9]*)\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(window.addressParsed, modes, indexSeqNo) + '/$1/$2/$3\'>>>>>/$1/$2/$3</a>');
    modes = ['reply', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(window.addressParsed, modes, indexSeqNo) + '/$1/$2\'>>>>/$1/$2</a>');//TODO i think you could break this by putting a '$' in the url hash
    modes = ['post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;(\d+)/g, '<a class=\'inthreadlink\' href=\'' + functions.getNewHash(window.addressParsed, modes, indexSeqNo) + '/$1\'>>>$1</a>');//TODO remove class
    
    return bodyPretty;
}

function pad(n) {
    return (n < 10) ? ('0' + n) : n;
}

function fillPost(postDiv, postJson, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged){
    var post = JSON.parse(postJson);
    
    if (seqNo == '1'){
        postDiv.setAttribute('class', 'post op');
    } else {
        postDiv.setAttribute('class', 'post reply');
    }
    
    if (flagged) {
        postDiv.setAttribute('class', postDiv.getAttribute('class') + ' flagged');
    }

    var postIntro = document.createElement('p');
    postIntro.setAttribute('class', 'intro');
    
    if (post.subject != null && post.subject != ''){
        var subjectSpan = document.createElement('span');
        subjectSpan.setAttribute('class', 'subject');
        subjectSpan.appendChild(document.createTextNode(post.subject));
        postIntro.appendChild(subjectSpan);
    } else {
        var subjectSpan = document.createElement('span');
        subjectSpan.setAttribute('class', 'blanksubject');
        postIntro.appendChild(subjectSpan);
    }
    
    if (post.author != null){
        var nameSpan;
        if (post.email != null && post.email != ''){
            nameSpan = document.createElement('a');
            nameSpan.setAttribute('class', 'email');
            nameSpan.setAttribute('href', 'mailto:' + post.email);
        } else {
            nameSpan = document.createElement('span');
            nameSpan.setAttribute('class', 'name');
        }
        nameSpan.appendChild(document.createTextNode(post.author));
        postIntro.appendChild(nameSpan);
    }
    
    if (timestamp != null){
        var date = new Date(timestamp);
        var timeString = date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
        var dateSpan = document.createElement('span');
        dateSpan.setAttribute('class', 'time');
        dateSpan.appendChild(document.createTextNode(timeString));
        postIntro.appendChild(dateSpan);
    }
    
    if (seqNo != null){
        var postNum = document.createElement('a');
        postNum.setAttribute('id', '' + seqNo);
        postNum.setAttribute('class', 'post_no');
        postNum.setAttribute('href', '#' + postDiv.id);
        postNum.appendChild(document.createTextNode('No. '));
        postIntro.appendChild(postNum);
        postIntro.appendChild(document.createTextNode(seqNo));
    }
    
    if (fromIndex && seqNo == '1' && indexSeqNo != null){
        var replyLink = document.createElement('a');
        replyLink.setAttribute('class', 'reply_link');
        replyLink.setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply'], indexSeqNo));//location.hash + '/' + indexSeqNo);//postDiv.getAttribute('data-thread'));//TODO this should be able to handle detached threads
        replyLink.appendChild(document.createTextNode('[Reply]'));
        postIntro.appendChild(replyLink);
    }

    var postFiles = document.createElement('div');
    if (post.files != null && post.files.length > 0){
        postFiles.setAttribute('class', 'files');
        for (let file of post.files){
            if (file.address != null && file.size != null){
                var fileDiv = document.createElement('div');
                fileDiv.setAttribute('class', 'file');
                var fileInfo = document.createElement('p');
                fileInfo.setAttribute('class', 'fileinfo');
                var fileSpan = document.createElement('span');
                fileSpan.appendChild(document.createTextNode('File: '));
                var fileLink = document.createElement('a');
                fileLink.setAttribute('href', file.address);
                fileLink.appendChild(document.createTextNode(slog.lastItemFromAddress(file.address)));
                
                var fileDetails = document.createElement('span');
                fileDetails.setAttribute('class', 'unimportant');
                let fileDims = '';
                if (file.width != null && file.height != null){
                    fileDims = ', ' + file.width + 'x' + file.height;
                }
                fileDetails.appendChild(document.createTextNode(' (' + (Math.round((parseFloat(file.size) / 1024.0) * 100)/100.0) + 'KiB' + fileDims + ')'));
                
                var fileImgLink = document.createElement('a');
                fileImgLink.setAttribute('href', file.address);
                var fileImg = document.createElement('img');
                fileImg.setAttribute('class', 'post-image');
                
                if (file.extension == null || browserDisplayableFormats.indexOf(file.extension) != -1){//TODO this is temporary so that I don't break the test board - should be changed (if the extension *IS* null, put just the link instead). should also check that file.height and file.width aren't null
                    fileImg.setAttribute('src', file.address);
                    
                    let maxDim = 255;
                    let imgWidth = parseInt(file.width);
                    let imgHeight = parseInt(file.height);
                    let longSide = imgHeight > imgWidth ? imgHeight : imgWidth;
                    
                    if (longSide > maxDim){
                        let factor = longSide / maxDim;
                        imgHeight /= factor;
                        imgWidth /= factor;
                    }
                    
                    fileImg.setAttribute('style', 'width: ' + imgWidth + 'px; height: ' + imgHeight + 'px;');
                } else {
                    fileImg.setAttribute('src', '/ipfs/QmSmVimunQTsmau3SH9ohESmzRNLCdXGjSHYpxvp9SeZp2');//TODO shouldn't have direct IPFS hashes in here
                }
                
                
                fileSpan.appendChild(fileLink);
                fileSpan.appendChild(fileDetails);
                fileInfo.appendChild(fileSpan);
                fileImgLink.appendChild(fileImg);
                fileDiv.appendChild(fileInfo);
                fileDiv.appendChild(fileImgLink);
                
                postFiles.appendChild(fileDiv);
            }
        }
    }

    var modControls = document.createElement('span');
    if (mod != null){
        modControls.setAttribute('class', 'controls');
        var modDelete = document.createElement('a');
        modDelete.setAttribute('href', '#');
        if (flagged){
            modDelete.setAttribute('onclick', 'return smug.modOperation("undelete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqNo + '", smug.refreshPage)');
            modDelete.innerHTML = '[-D]';
        } else {
            modDelete.setAttribute('onclick', 'return smug.modOperation("delete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqNo + '", smug.refreshPage)');
            modDelete.innerHTML = '[D]';
        }
        var modDeleteAll = document.createElement('a');
        modDeleteAll.setAttribute('href', '#');
        modDeleteAll.setAttribute('onclick', 'return smug.modOperation("deleteall", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqNo + '", smug.refreshPage)');
        modDeleteAll.innerHTML = '[D+]';
        
        var modBan = document.createElement('a');
        modBan.setAttribute('href', '#');
        modBan.setAttribute('onclick', 'return smug.modOperation("ban", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqNo + '", smug.refreshPage)');
        modBan.innerHTML = '[B]';
        
        var modBanDelete = document.createElement('a');
        modBanDelete.setAttribute('href', '#');
        modBanDelete.setAttribute('onclick', 'return smug.modOperation("bandelete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqNo + '", smug.refreshPage)');
        modBanDelete.innerHTML = '[B&D]';
        
        modControls.appendChild(modDelete);
        modControls.appendChild(modDeleteAll);
        modControls.appendChild(modBan);
        modControls.appendChild(modBanDelete);
    }
    
    var postBody = document.createElement('div');
    if (post.body != null){
        postBody.setAttribute('class', 'body');
        var postLine = document.createElement('p');
        postLine.setAttribute('class', 'body-line ltr');
        postLine.innerHTML = decoratePostBody(post.body, indexSeqNo);
        //postLine.appendChild(document.createTextNode(decoratePostBody(post.body)));//innerHTML = post.body;//decoratePostBody(document.createTextNode(post.body).data);
        //postLine.appendChild(document.createTextNode(post.body));
        postBody.appendChild(postLine);
    }
    
    postDiv.appendChild(postIntro);
    postDiv.appendChild(postFiles);
    postDiv.appendChild(modControls);
    postDiv.appendChild(postBody);
}

function fillCatalogPost(postDiv, postJson, seqNo, timestamp, fromIndex, indexSeqNo, mod, flagged, numReplies){
    var post = JSON.parse(postJson);
    
    var postDivInner = postDiv.children[0];//TODO
    
    var imageLink = document.createElement('a');
    if (post.files != null && post.files.length > 0){
        if (post.files[0].address != null && post.files[0].size != null){
            imageLink.setAttribute('href', functions.getNewHash(window.addressParsed, ['post', 'reply', 'catalog'], indexSeqNo));
            var fileImg = document.createElement('img');
            if (browserDisplayableFormats.indexOf(post.files[0].extension) != -1) {
                fileImg.setAttribute('src', post.files[0].address);
            } else {
                fileImg.setAttribute('src', '/ipfs/QmSmVimunQTsmau3SH9ohESmzRNLCdXGjSHYpxvp9SeZp2');
            }
            fileImg.setAttribute('class', 'thread-image');
            imageLink.appendChild(fileImg);
        }
    }
    
    var replies = document.createElement('div');
    replies.setAttribute('class', 'replies');
    replies.innerHTML = '<strong>R: ' + numReplies + '</strong>';
    
    var postIntro = document.createElement('p');
    postIntro.setAttribute('class', 'intro');
    if (post.subject != null && post.subject != ''){
        var subjectSpan = document.createElement('span');
        subjectSpan.setAttribute('class', 'subject');
        subjectSpan.appendChild(document.createTextNode(post.subject));
        postIntro.appendChild(subjectSpan);
    }
    
    var postLine = document.createElement('p');
    postLine.setAttribute('class', 'body-line ltr');
    if (post.body != null){
        postLine.innerHTML = decoratePostBody(post.body, indexSeqNo);
    }
    
    postDivInner.appendChild(imageLink);
    postDivInner.appendChild(replies);
    postDivInner.appendChild(postIntro);
    postDivInner.appendChild(postLine);
    
}

function appendPostDiv(threadDiv, anchor){
    var postDiv = document.createElement('div');
    
    if (anchor != null){
        //let index = Array.prototype.indexOf.call(threadDiv.childNodes, anchor);
        //threadDiv.insertBefore(postDiv, threadDiv.childNodes[index].nextSibling);
        //threadDiv.insertBefore(document.createElement('br'), threadDiv.childNodes[index].nextSibling);//TODO work out why i thought this was a good idea to begin with
        
        threadDiv.appendChild(postDiv);
        threadDiv.appendChild(document.createElement('br'));
    } else {
        //threadDiv.appendChild(document.createElement('br'));
        threadDiv.appendChild(postDiv);
        threadDiv.appendChild(document.createElement('br'));
    }
    return postDiv;
}

function setTitle(indexUrl, indexName){
    document.getElementById('heading').innerHTML = '';
    if (indexUrl != null) {
        document.getElementById('heading').appendChild(document.createTextNode('/' + indexUrl + '/ - ' + indexName));
    } else if (indexName != null) {
        document.getElementById('heading').appendChild(document.createTextNode('[Detached Board] - ' + indexName));
    } //TODO this stopped working
    else {
        document.getElementById('heading').appendChild(document.createTextNode('[Detached Thread]'));
    }
}

function fillBoardlist(pageStatus){
    //let addressComponents = functions.parseLocationAddress(location.hash);
    let siteRootAddress = null;
    let sitePublicAddress = null;
    for (let item of window.addressParsed){
        if (item.mode == 'site'){
            siteRootAddress = item.actualAddress;
            sitePublicAddress = item.publicAddress;
            break;
        }
    }
    
    if (siteRootAddress && pageStatus[siteRootAddress]){
        let linkHome = document.getElementById('boardlist-home');
        linkHome.setAttribute('href', '#' + sitePublicAddress);
        
        let linkCreate = document.getElementById('boardlist-create');
        linkCreate.setAttribute('href', '#' + sitePublicAddress + '/create');
        
        let linkOptions = document.getElementById('boardlist-options');
        linkOptions.setAttribute('href', '#' + sitePublicAddress + '/options');
        
        let linkManage = document.getElementById('boardlist-manage');
        linkManage.setAttribute('href', '#' + sitePublicAddress + '/manage');
        
        let payloads = slog.calculateSLogPayloads(pageStatus[siteRootAddress].sLog);
        let boards = document.getElementById('boardlist-boards');
        if (payloads.length > 0) {
            boards.innerHTML = ' [';
        }
        let firstBoard = true;
        for (let item of payloads){
            boards.innerHTML += firstBoard ? ' ' : ' / ';
            firstBoard = false;
            
            let link = document.createElement('a');
            link.setAttribute('href', '#' + sitePublicAddress + '/' + item.data.uri);
            link.appendChild(document.createTextNode(item.data.uri));
            boards.appendChild(link);
        }
        if (payloads.length > 0) {
            boards.innerHTML += ' ] ';
        }
    }
}

function setThreadHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = '';
    htmlBodyContent += pageHtml.boardlist;
    htmlBodyContent += pageHtml.header;
    htmlBodyContent += pageHtml.banner;
    htmlBodyContent += pageHtml.uploadForm;
    htmlBodyContent += '<hr>'; //TODO html really shouldn't be in here
    htmlBodyContent += pageHtml.threadStub;
    htmlBodyContent += pageHtml.threadControls;
    htmlBodyContent += '<br><br><br>';

    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
}

function setIndexHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = '';
    htmlBodyContent += pageHtml.boardlist;
    htmlBodyContent += pageHtml.header;
    htmlBodyContent += pageHtml.uploadForm;
    htmlBodyContent += pageHtml.threadStub;
    htmlBodyContent += '<br><br><br>';

    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
    document.getElementById('submit').innerHTML = 'New Thread';
}

function setCatalogHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = '';
    htmlBodyContent += pageHtml.boardlist;
    htmlBodyContent += pageHtml.header;
    htmlBodyContent += pageHtml.uploadForm;
    htmlBodyContent += pageHtml.catalogStub;
    htmlBodyContent += '<br><br><br>';

    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
    document.body.classList.value = 'theme-catalog active-catalog';
    document.getElementById('submit').innerHTML = 'New Thread';
}

function getCatalogEmptyThread(){
    var outer = document.createElement('div');
    outer.setAttribute('class', 'mix');
    outer.setAttribute('style', 'display: inline-block;');
    
    var inner = document.createElement('div');
    inner.setAttribute('class', 'thread grid-li grid-size-small');
    
    outer.appendChild(inner);
    
    return outer;
}

function setCreationHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = '';
    htmlBodyContent += pageHtml.boardlist;
    
    htmlBodyContent += pageHtml.siteModCreateHeader;
    htmlBodyContent += pageHtml.siteModCreateForm;
        
    htmlBodyContent += pageHtml.siteBoardCreateHeader;
    htmlBodyContent += pageHtml.siteBoardCreateForm;
    
    htmlBodyContent += pageHtml.siteAddHeader;
    htmlBodyContent += pageHtml.siteAddForm;
    
    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
    document.getElementsByName('threadServers[]')[0].value = threadServer;
}

function setBoardlistHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = pageHtml.boardlist;
    htmlBodyContent += pageHtml.siteBoardlistHeader;
    htmlBodyContent += pageHtml.siteBoardlist;
    
    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
}

function setOptionsHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = pageHtml.boardlist;
    htmlBodyContent += pageHtml.optionsHeader;
    htmlBodyContent += pageHtml.optionsForm;
    
    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent; 
}

function setManageHTML(){
    var htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    var htmlBodyContent = pageHtml.boardlist;
    htmlBodyContent += '<h1>Board Management</h1><br>Not done yet, will enable proper modification of board settings and so on.';
    
    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent; 
}

function setNewBoardAddress(address){
    document.getElementById('board-register-address').value = slog.lastItemFromAddress(address);
}

function setNewModAddress(address){
    document.getElementById('mod-register-address').value = slog.lastItemFromAddress(address);
}

function fillBoardlistTable(pageStatus){
    let siteRootAddress = null;
    let sitePublicAddress = null;
    for (let item of window.addressParsed){
        if (item.mode == 'site'){
            siteRootAddress = item.actualAddress;
            sitePublicAddress = item.publicAddress;
            break;
        }
    }
    
    if (siteRootAddress && pageStatus[siteRootAddress]){
        let payloads = slog.calculateSLogPayloads(pageStatus[siteRootAddress].sLog);
        let boardTable = document.getElementById('boardlist-table');
        
        let headBoard = document.createElement('th');
        headBoard.appendChild(document.createTextNode('Board'));
        let headTitle = document.createElement('th');
        headTitle.appendChild(document.createTextNode('Title'));
        let headAddress = document.createElement('th');
        headAddress.appendChild(document.createTextNode('Address'));
        
        let headRow = document.createElement('tr');
        headRow.appendChild(headBoard);
        headRow.appendChild(headTitle);
        headRow.appendChild(headAddress);
        boardTable.appendChild(headRow);
                
        for (let item of payloads){
            if (item.data != null && item.data.uri != null && item.data.address != null){
                let uri = document.createElement('td');
                let title = document.createElement('td');
                let address = document.createElement('td');
                
                //functions.fillIndexTitle(item.data.address, title);
                
                sio.getJsonObjFromAPI(item.data.address, function(indexRaw){
                    let indexObj = JSON.parse(indexRaw);
                    if (indexObj.settings != null){
                        sio.getJsonObjFromAPI(indexObj.settings, function(settingsRaw){
                            let settingsObj = JSON.parse(settingsRaw);
                            if (settingsObj.title != null){
                                title.appendChild(document.createTextNode(settingsObj.title));
                            }
                        });
                    }
                });
                
                let link = document.createElement('a');
                link.setAttribute('href', '#' + sitePublicAddress + '/' + item.data.uri);
                link.appendChild(document.createTextNode('/' + item.data.uri + '/'));
                uri.appendChild(link);
                
                let rawLink = document.createElement('a');
                rawLink.setAttribute('href', '#' + item.data.address);
                rawLink.appendChild(document.createTextNode(item.data.address));
                address.appendChild(rawLink);
                
                let row = document.createElement('tr');
                row.appendChild(uri);
                row.appendChild(title);
                row.appendChild(address);
                boardTable.appendChild(row);
            }
        }
    }
}

module.exports.fillPost = fillPost;
module.exports.fillCatalogPost = fillCatalogPost;
module.exports.appendPostDiv = appendPostDiv;
module.exports.setTitle = setTitle;
module.exports.fillBoardlist = fillBoardlist;
module.exports.setThreadHTML = setThreadHTML;
module.exports.setIndexHTML = setIndexHTML;
module.exports.setCatalogHTML = setCatalogHTML;
module.exports.getCatalogEmptyThread = getCatalogEmptyThread;
module.exports.setCreationHTML = setCreationHTML;
module.exports.setBoardlistHTML = setBoardlistHTML;
module.exports.setOptionsHTML = setOptionsHTML;
module.exports.setManageHTML = setManageHTML;
module.exports.setNewBoardAddress = setNewBoardAddress;
module.exports.setNewModAddress = setNewModAddress;
module.exports.fillBoardlistTable = fillBoardlistTable;

