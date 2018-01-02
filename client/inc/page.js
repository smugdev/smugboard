var pageHtml = require('./pagehtml.js');
var functions = require('./functions.js');
var wrapperFuncs = require('../../common/wrapperfuncs.js');
var slog = require('../../common/slog.js');

var browserDisplayableFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico'];

function decoratePostBody(bodyRaw, indexSeqno, addressObj){
    let bodyPretty = bodyRaw + '';
    
    bodyPretty = bodyPretty.replace(/&/g, '&amp;');
    bodyPretty = bodyPretty.replace(/</g, '&lt;');
    bodyPretty = bodyPretty.replace(/>/g, '&gt;');
    bodyPretty = bodyPretty.replace(/(&gt;.*)(\r|\n|$)/g, '<span style=\'color:#789922\'>$1</span>$2');
    
    //TODO strikethrough
    bodyPretty = bodyPretty.replace(/\*\*(.*)\*\*/g, '<span class=\'spoiler\'>$1</span>');
    bodyPretty = bodyPretty.replace(/==(.*)==/g, '<span class=\'heading\'>$1</span>');
    bodyPretty = bodyPretty.replace(/'''(.*)'''/g, '<strong>$1</strong>');
    bodyPretty = bodyPretty.replace(/''(.*)''/g, '<em>$1</em>');
    
    let modes = ['site', 'board', 'thread', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;&gt;&gt;\/([a-z0-9][a-z0-9]*)\/([a-z0-9][a-z0-9]*)\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(addressObj, modes, [indexSeqno]) + '/$1/$2/$3/$4\'>>>>>>/$1/$2/$3/$4</a>');
    modes = ['board', 'thread', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;&gt;\/([a-z0-9][a-z0-9]*)\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(addressObj, modes, [indexSeqno]) + '/$1/$2/$3\'>>>>>/$1/$2/$3</a>');
    modes = ['thread', 'post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;&gt;\/(\d+)\/(\d+)/g, '<a href=\'' + functions.getNewHash(addressObj, modes, [indexSeqno]) + '/$1/$2\'>>>>/$1/$2</a>');//TODO i think you could break this by putting a '$' in the url hash
    modes = ['post'];
    bodyPretty = bodyPretty.replace(/&gt;&gt;(\d+)/g, '<a class=\'inthreadlink\' href=\'' + functions.getNewHash(addressObj, modes) + '/$1\'>>>$1</a>');//TODO remove class
    
    return bodyPretty;
}

function pad(n) {
    return (n < 10) ? ('0' + n) : n;
}

function fillPost(postDiv, post, seqno, timestamp, addressObj, viewingFromIndex, indexSeqno, mod, flagged){
    //var post = JSON.parse(postJson);
    
    if (seqno === 1){
        postDiv.setAttribute('class', 'post op');
    } else {
        postDiv.setAttribute('class', 'post reply');
    }
    
    if (flagged) {
        postDiv.setAttribute('class', postDiv.getAttribute('class') + ' flagged');
    }
    
    let extras = [];
    if (indexSeqno) {
        extras.push(indexSeqno);
    }
    extras.push(seqno);
    let postFullLink = document.createElement('div');
    postFullLink.setAttribute('id', functions.getNewHash(addressObj, ['post'], extras));

    let postIntro = document.createElement('p');
    postIntro.setAttribute('class', 'intro');
    
    if (post.subject != null && post.subject !== ''){
        let subjectSpan = document.createElement('span');
        subjectSpan.setAttribute('class', 'subject');
        subjectSpan.appendChild(document.createTextNode(post.subject));
        postIntro.appendChild(subjectSpan);
    } else {
        let subjectSpan = document.createElement('span');
        subjectSpan.setAttribute('class', 'blanksubject');
        postIntro.appendChild(subjectSpan);
    }
    
    if (post.author != null){
        let nameSpan;
        if (post.email != null && post.email !== ''){
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
        let date = new Date(timestamp);
        let timeString = date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
        let dateSpan = document.createElement('span');
        dateSpan.setAttribute('class', 'time');
        dateSpan.appendChild(document.createTextNode(timeString));
        postIntro.appendChild(dateSpan);
    }
    
    if (seqno != null){
        let postNum = document.createElement('a');
        postNum.setAttribute('id', '' + seqno);
        postNum.setAttribute('class', 'post_no');
        postNum.setAttribute('href', functions.getNewHash(addressObj, ['post'], extras));
        postNum.appendChild(document.createTextNode('No. '));
        postIntro.appendChild(postNum);
        postIntro.appendChild(document.createTextNode(seqno));
    }
    
    if (viewingFromIndex && seqno === 1 && indexSeqno != null){
        let replyLink = document.createElement('a');
        replyLink.setAttribute('class', 'reply_link');
        replyLink.setAttribute('href', functions.getNewHash(addressObj, ['post', 'thread'], [indexSeqno]));//location.hash + '/' + indexSeqno);//postDiv.getAttribute('data-thread'));//TODO this should be able to handle detached threads
        replyLink.appendChild(document.createTextNode('[Reply]'));
        postIntro.appendChild(replyLink);
    }

    let postFiles = document.createElement('div');
    if (post.files != null && post.files.length > 0){
        postFiles.setAttribute('class', 'files');
        for (let file of post.files){
            if (file.address != null && file.size != null){
                let fileDiv = document.createElement('div');
                fileDiv.setAttribute('class', 'file');
                let fileInfo = document.createElement('p');
                fileInfo.setAttribute('class', 'fileinfo');
                let fileSpan = document.createElement('span');
                fileSpan.appendChild(document.createTextNode('File: '));
                let fileLink = document.createElement('a');
                fileLink.setAttribute('href', file.address);
                fileLink.appendChild(document.createTextNode(file.filename));
                
                let fileDetails = document.createElement('span');
                fileDetails.setAttribute('class', 'unimportant');
                let fileDims = '';
                if (file.width != null && file.height != null){
                    fileDims = ', ' + file.width + 'x' + file.height;
                }
                fileDetails.appendChild(document.createTextNode(' (' + (Math.round((parseFloat(file.size) / 1024.0) * 100)/100.0) + 'KiB' + fileDims + ')'));
                
                let fileImgLink = document.createElement('a');
                fileImgLink.setAttribute('href', file.address);
                let fileImg = document.createElement('img');
                fileImg.setAttribute('class', 'post-image');
                
                if (file.extension != null && browserDisplayableFormats.indexOf(file.extension) !== -1 && file.height != null && file.width != null){
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

    let modControls = document.createElement('span');
    if (mod){
        modControls.setAttribute('class', 'controls');
        let modDelete = document.createElement('a');
        modDelete.setAttribute('href', '#');
        if (flagged){
            modDelete.setAttribute('onclick', 'return smug.modOperation("undelete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqno + '", smug.refreshPage)');
            modDelete.innerHTML = '[-D]';
        } else {
            modDelete.setAttribute('onclick', 'return smug.modOperation("delete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqno + '", smug.refreshPage)');
            modDelete.innerHTML = '[D]';
        }
        let modDeleteAll = document.createElement('a');
        modDeleteAll.setAttribute('href', '#');
        modDeleteAll.setAttribute('onclick', 'return smug.modOperation("deleteall", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqno + '", smug.refreshPage)');
        modDeleteAll.innerHTML = '[D+]';
        
        let modBan = document.createElement('a');
        modBan.setAttribute('href', '#');
        modBan.setAttribute('onclick', 'return smug.modOperation("ban", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqno + '", smug.refreshPage)');
        modBan.innerHTML = '[B]';
        
        let modBanDelete = document.createElement('a');
        modBanDelete.setAttribute('href', '#');
        modBanDelete.setAttribute('onclick', 'return smug.modOperation("bandelete", "' + mod + '", "' + postDiv.getAttribute('data-thread') + '", "' + seqno + '", smug.refreshPage)');
        modBanDelete.innerHTML = '[B&D]';
        
        modControls.appendChild(modDelete);
        modControls.appendChild(modDeleteAll);
        modControls.appendChild(modBan);
        modControls.appendChild(modBanDelete);
    }
    
    let postBody = document.createElement('div');
    if (post.body != null){
        postBody.setAttribute('class', 'body');
        let postLine = document.createElement('p');
        postLine.setAttribute('class', 'body-line ltr');
        postLine.innerHTML = decoratePostBody(post.body, indexSeqno, addressObj);
        postBody.appendChild(postLine);
    }
    
    postDiv.appendChild(postFullLink);
    postDiv.appendChild(postIntro);
    postDiv.appendChild(postFiles);
    postDiv.appendChild(modControls);
    postDiv.appendChild(postBody);
}

function getCatalogEmptyThread(){//TODO replace with line in page_html.js
    var outer = document.createElement('div');
    outer.setAttribute('class', 'mix');
    outer.setAttribute('style', 'display: inline-block;');
    
    var inner = document.createElement('div');
    inner.setAttribute('class', 'thread grid-li grid-size-small');
    
    outer.appendChild(inner);
    
    return outer;
}

function loadCatalog(id, wrappers, addressObj, knownMods){
    var threadStub = document.getElementById('Grid');
    
    if (!wrappers[id].sLog) {
        return;
    }
    
    let promises = [];
    for (let item of wrappers[id].sLog){
        if ((!modMode && item.removed) || !(item.data && item.data.payload && item.data.payload.data && item.data.payload.data.thread)){
            continue;
        }
        let threadDiv = getCatalogEmptyThread();
        threadDiv.setAttribute('id', item.address);
        threadStub.appendChild(threadDiv);
        
        let threadId = item.data.payload.data.thread.address;
        promises.push(
            wrapperFuncs.pullWrapperStub(threadId, wrappers).then(() => {
                if (wrappers[threadId].last.data.info.mode !== 'thread'){
                    return Promise.reject('Item ' + threadId + ' is not a valid thread.');
                } else {
                    return slog.getSLogObj(wrappers[threadId].last.data.info.op);
                    //let promisesInner = [];
                    //promisesInner.push(slog.getSLogObj(wrappers[threadId].last.data.info.op));
                    //promisesInner.push(slog.updateSLog(wrappers[threadId].sLog, wrappers[threadId].last.data.head, 3));
                    //return Promise.all(promisesInner);
                }
            }).then(value => {
                let sLog = [value];
                //if (values[1][0].data.seqno !== 1){
                //sLog.push(value);
                //}
                //sLog = sLog.concat(values[1]);
                wrappers[threadId].sLog = sLog;
                
                return loadCatalogStub(threadDiv, threadId, wrappers, addressObj, knownMods, modMode, true, item.data.seqno);
            })
        );
    }
    return Promise.all(promises);
}

function loadCatalogStub(threadDiv, id, wrappers, addressObj, knownMods, modMode, fromIndex, indexSeqno){
    for (let mod of knownMods){
        slog.subtractSLog(wrappers[id].sLog, wrappers[mod].sLog);
    }
    
    if (wrappers[id].sLog.length < 1 || wrappers[id].sLog[0].data.seqno !== 1){//OP was deleted, nothing to do
        return;
    }
    
    let promises = [];
    for (let item of wrappers[id].sLog){
        if ((!modMode && item.removed) || !(item.data && item.data.payload && item.data.payload.data && item.data.payload.data.post)){
            continue;
        }
        
        if (document.getElementById(item.address)){
            //post already exists
            continue;
        }
        
        //TODO if (document.getElementById(item.address) && item.removed) - post deleted by a mod, grey it out
        
        let postDiv = document.createElement('div');
        postDiv.setAttribute('id', item.address);
        threadDiv.appendChild(postDiv);
        
        promises.push(
            slog.getSLogObj(item.data.payload.data.post).then(post => {
                fillPost(postDiv, post.data, item.data.seqno, item.data.timestamp, addressObj, fromIndex, indexSeqno, modMode, item.removed);
                threadDiv.insertBefore(document.createElement('br'), postDiv.nextSibling);
                return;
            })
        );
    }
    
    if (fromIndex) {
        threadDiv.appendChild(document.createElement('hr'));
    }
    
    return Promise.all(promises);
}

function loadBoard(id, wrappers, addressObj, knownMods, modMode){
    let threadStub = document.getElementById('thread');
    
    if (!wrappers[id].sLog) {
        return;
    }
        
    let promises = [];
    for (let item of wrappers[id].sLog){
        if ((!modMode && item.removed) || !(item.data && item.data.payload && item.data.payload.data && item.data.payload.data.thread)){
            continue;
        }
        
        let threadDiv = document.createElement('div');
        threadDiv.setAttribute('id', item.address);
        threadStub.appendChild(threadDiv);
        
        let threadId = item.data.payload.data.thread.address;
        promises.push(
            wrapperFuncs.pullWrapperStub(threadId, wrappers).then(() => {
                if (wrappers[threadId].last.data.info.mode !== 'thread'){
                    return Promise.reject('Item ' + threadId + ' is not a valid thread.');
                } else {
                    let promisesInner = [];
                    promisesInner.push(slog.getSLogObj(wrappers[threadId].last.data.info.op));
                    promisesInner.push(slog.updateSLog(wrappers[threadId].sLog, wrappers[threadId].last.data.head, 3));
                    return Promise.all(promisesInner);
                }
            }).then(values => {
                let sLog = [];
                if (values[1][0].data.seqno !== 1){
                    sLog.push(values[0]);
                }
                sLog = sLog.concat(values[1]);
                wrappers[threadId].sLog = sLog;
                
                return loadThread(threadDiv, threadId, wrappers, addressObj, knownMods, modMode, true, item.data.seqno);
            })
        );
    }
    return Promise.all(promises);
}

function loadThread(threadDiv, id, wrappers, addressObj, knownMods, modMode, fromIndex, indexSeqno){
    for (let mod of knownMods){
        slog.subtractSLog(wrappers[id].sLog, wrappers[mod].sLog);
    }
    
    if (wrappers[id].sLog.length < 1 || wrappers[id].sLog[0].data.seqno !== 1){//OP was deleted, nothing to do
        return;
    }

    if (threadDiv == null) {
        threadDiv = document.getElementById('thread');
    }
    
    let promises = [];
    for (let item of wrappers[id].sLog){
        if ((!modMode && item.removed) || !(item.data && item.data.payload && item.data.payload.data && item.data.payload.data.post)){
            continue;
        }
        
        if (document.getElementById(item.address)){
            //post already exists
            continue;
        }
        
        //TODO if (document.getElementById(item.address) && item.removed) - post deleted by a mod, grey it out
        
        let postDiv = document.createElement('div');
        postDiv.setAttribute('id', item.address);
        threadDiv.appendChild(postDiv);
        
        promises.push(
            slog.getSLogObj(item.data.payload.data.post).then(post => {
                fillPost(postDiv, post.data, item.data.seqno, item.data.timestamp, addressObj, fromIndex, indexSeqno, modMode, item.removed);
                threadDiv.insertBefore(document.createElement('br'), postDiv.nextSibling);
                return;
            })
        );
    }
    
    if (fromIndex) {
        threadDiv.appendChild(document.createElement('hr'));
    }
    
    return Promise.all(promises);
}

function setTemplateHTML(){
    let htmlHeadContent = pageHtml.css;
    htmlHeadContent += pageHtml.favicon;
    let htmlBodyContent = pageHtml.boardlist;
    //htmlBodyContent += pageHtml.loadIndicator;
    //htmlBodyContent += pageHtml.header
    
    document.head.innerHTML = htmlHeadContent;
    document.body.innerHTML = htmlBodyContent;
}

function setHeader(wrappers, addressObj){
    let title = null;
    let uri = null;
    let fromSite = false;
    for (let item of addressObj){
        if (item.mode === 'site'){
            title = wrappers[item.actualAddress].last.data.info.title;
            fromSite = true;
        }
    }
    for (let item of addressObj){
        if (item.mode === 'board'){
            title = wrappers[item.actualAddress].last.data.info.title;
            uri = item.publicAddress;
            fromSite = false;
        }
    }
    setTitle(title, uri, fromSite);
}

function setNavLinks(inThread, addressObj){
    if (inThread){
        document.getElementById('thread-return').setAttribute('href', functions.getNewHash(addressObj, ['thread', 'post']));
    }
    document.getElementById('catalog-link').setAttribute('href', functions.getNewHash(addressObj, ['post', 'thread', 'catalog'], ['catalog']));
    document.getElementById('index-link').setAttribute('href', functions.getNewHash(addressObj, ['post', 'thread', 'catalog']));
}

function setPostFormData(id){
    //if (item.mode === 'board' || item.mode === 'thread') {
    document.getElementById('submit').setAttribute('onclick', 'smug.submitPost("' + id + '", smug.wrappers, "postform")');
}

function setTitle(title, uri, fromSite){
    document.getElementById('heading').innerHTML = '';
    if (uri != null && title != null) {
        document.getElementById('heading').appendChild(document.createTextNode('/' + uri + '/ - ' + title));
    } else if (title != null) {
        if (fromSite) {
            document.getElementById('heading').appendChild(document.createTextNode(title));
        } else {
            document.getElementById('heading').appendChild(document.createTextNode('[Detached Board] - ' + title));
        }
    } else {
        document.getElementById('heading').appendChild(document.createTextNode('[Detached Thread]'));
    }
}

function setSiteHTML(){
    document.body.innerHTML += pageHtml.siteBoardlistHeader;
    document.body.innerHTML += pageHtml.siteBoardlist;
    
    //TODO hide load indicator
    
}

function setBoardHTML(){
    document.body.innerHTML += pageHtml.header;
    document.body.innerHTML += pageHtml.banner;
    document.body.innerHTML += pageHtml.uploadForm;
    document.body.innerHTML += pageHtml.threadStub;
    document.getElementById('submit').innerHTML = 'New Thread';
    
}

function setCatalogHTML(){
    document.body.innerHTML += pageHtml.header;
    document.body.innerHTML += pageHtml.banner;
    document.body.innerHTML += pageHtml.uploadForm;
    document.body.innerHTML += pageHtml.catalogStub;
    document.body.classList.value = 'theme-catalog active-catalog';
    document.getElementById('submit').innerHTML = 'New Thread';
}

function setThreadHTML(){
    document.body.innerHTML += pageHtml.header;
    document.body.innerHTML += pageHtml.banner;
    document.body.innerHTML += pageHtml.uploadForm;
    document.body.innerHTML += pageHtml.threadStub;
    document.body.innerHTML += pageHtml.threadControls;
    
}

function setEditorHTML(){
    document.body.innerHTML += pageHtml.objectEditorHeader;
}

function fillBoardlist(sitePublicAddress, siteSLog){
    document.getElementById('boardlist-home').setAttribute('href', '#' + sitePublicAddress);
    document.getElementById('boardlist-create').setAttribute('href', '#' + sitePublicAddress + '/create');
    document.getElementById('boardlist-options').setAttribute('href', '#' + sitePublicAddress + '/options');
    document.getElementById('boardlist-manage').setAttribute('href', '#' + sitePublicAddress + '/manage');

    let items = [];
    for (let entry of siteSLog){
        if (!entry.removed && entry.data && entry.data.payload && entry.data.payload.data && entry.data.payload.data.uri){
            items.push(entry.data.payload.data.uri);
        }
    }
    
    let firstBoard = true;
    let boards = document.getElementById('boardlist-boards');
    boards.innerHTML = ' [';
    for (let item of items){
        boards.innerHTML += firstBoard ? ' ' : ' / ';
        firstBoard = false;
        
        let link = document.createElement('a');
        link.setAttribute('href', '#' + sitePublicAddress + '/' + item);
        link.appendChild(document.createTextNode(item));
        boards.appendChild(link);
    }
    boards.innerHTML += ' ]';
}

function fillBoardlistTable(sitePublicAddress, id, wrappers){
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
    
    let payloads = [];
    for (let entry of wrappers[id].sLog){
        if (!entry.removed && entry.data && entry.data.payload && entry.data.payload.data && entry.data.payload.data.address){
            payloads.push(entry.data.payload);
        }
    }
    
    let promises = [];
    for (let payload of payloads){
        let uri = document.createElement('td');
        let title = document.createElement('td');
        let address = document.createElement('td');
        
        let link = document.createElement('a');
        link.setAttribute('href', '#' + sitePublicAddress + '/' + payload.data.uri);
        link.appendChild(document.createTextNode('/' + payload.data.uri + '/'));
        uri.appendChild(link);

        let rawLink = document.createElement('a');
        rawLink.setAttribute('href', '#' + payload.data.address);
        rawLink.appendChild(document.createTextNode(payload.data.address));
        address.appendChild(rawLink);

        let row = document.createElement('tr');
        row.appendChild(uri);
        row.appendChild(title);
        row.appendChild(address);
        boardTable.appendChild(row);
        
        promises.push(
            wrapperFuncs.pullWrapperStub(payload.data.address, wrappers).then(() => {
                title.appendChild(document.createTextNode(wrappers[payload.data.address].last.data.info.title));
                return;
            })
        );
    }
    return Promise.all(promises);
}
module.exports.setSiteHTML = setSiteHTML;
module.exports.setBoardHTML = setBoardHTML;
module.exports.setCatalogHTML = setCatalogHTML;
module.exports.setThreadHTML = setThreadHTML;
module.exports.setEditorHTML = setEditorHTML;
module.exports.loadBoard = loadBoard;
module.exports.loadCatalog = loadCatalog;
module.exports.loadThread = loadThread;
module.exports.setTemplateHTML = setTemplateHTML;
module.exports.setHeader = setHeader;
module.exports.setNavLinks = setNavLinks;
module.exports.setPostFormData = setPostFormData;
module.exports.setTitle = setTitle;
module.exports.fillBoardlist = fillBoardlist;
module.exports.fillBoardlistTable = fillBoardlistTable;
