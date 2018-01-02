/* General HTML */

var favicon = '<link rel=\'icon\' type=\'image/x-icon\' href=\'/ipfs/QmdHesoVTVQuMTM35fhwTrGbkeWZwfZsr1dcrHt91zNPap\'>';

var css = '<link id=\'pagecss\' href=\'styles.css\' rel=\'stylesheet\'></link>';

var boardlist = '<div class=\'boardlist\'><span class=\'sub\' data-description=\'0\'>[ <a id=\'boardlist-home\' href=\'\'>Home</a> / <a id=\'boardlist-create\' href=\'\'>Create</a> / <a id=\'boardlist-manage\' href=\'\'>Manage</a> ]</span>  <span class=\'sub\' data-description=\'1\' style=\'display: none;\'>[]</span><a href=\'javascript:void(0)\' id=\'boardlist-options\' title=\'Options\' style=\'float: right;\'>[Options]</a><span id=\'boardlist-boards\' class=\'favorite-boards\'></span></div>';

var loadIndicator = '<div id="loadindicator" style=\'float: left;\'><br>Loading...</div>';

/* Thread HTML */

var header = '<img class=\'board_image\' src=\'img/banner.jpg\'><header><h1 id=\'heading\'></h1><div class=\'subtitle\'><p><a id=\'index-link\'>Index</a>&nbsp;&nbsp;<a id=\'catalog-link\'>Catalog</a></p></div></header>';

var banner = '<div class=\'banner\'>Posting mode: Reply</div>';

var uploadForm = '<div id=\'post-form-outer\'><div id=\'post-form-inner\'><form method=\'post\' enctype=\'multipart/form-data\' id=\'postform\' name=\'post\'><input name=\'thread\' value=\'\' type=\'hidden\'><input name=\'board[]\' value=\'\' type=\'hidden\'><table class=\'post-table\'><tbody><tr><th>Name</th><td><input type=\'text\' autocomplete=\'off\' maxlength=\'35\' size=\'25\' name=\'author\'></td></tr><tr><th>Email</th><td><input type=\'text\' autocomplete=\'off\' maxlength=\'40\' size=\'25\' name=\'email\'></td></tr><tr><th>Subject </th><td><input type=\'text\' autocomplete=\'off\' maxlength=\'100\' size=\'25\' name=\'subject\' style=\'float:left;\'><button type=\'button\' id=\'submit\' style=\'margin-left:2px;\' accesskey=\'s\' onclick=\'return false\'>New Reply</button></td></tr><tr><th>Comment <span class=\'required-star\'>*</span></th><td><textarea cols=\'35\' rows=\'5\' id=\'body\' name=\'body\'></textarea></td></tr><tr id=\'upload\'><th>File </th><td><input name=\'file\' id=\'upload_file\' type=\'file\'><script type=\'text/javascript\'>if (typeof init_file_selector !== \'undefined\') init_file_selector(5);</script></td></tr></tbody></table></div></div>';

var threadStub = '<hr><div id=\'thread\'><div id=\'stub\'></div></div>';

var threadControls = '<div id=\'thread-interactions\'><hr><span id=\'thread-links\'><a id=\'thread-return\' href=\'\'>[Return]</a><a href=\'javascript:void(0)\' id=\'thread-top\', onclick=\'document.body.scrollTop = document.documentElement.scrollTop = 0;\'>[Go to top]</a><!--<a href=\'/a/catalog.html\' id=\'thread-catalog\'>[Catalog]</a>--><span id=\'updater\'><a id=\'update_thread\' href=\'javascript:void(0)\'>[Update]</a> (<input type=\'checkbox\' id=\'auto_update_status\' checked> Auto) <span id=\'update_secs\'></span></span></span></div><br><br><br>';

/* Catalog HTML */

var catalogStub = '<div class=\'threads\'><div id=\'Grid\'></div></div>';

/* Site HTML (create page) */

var siteModCreateHeader = '<header><h1>Moderator Creation</h1></header>';

var siteModCreateForm = '<form method=\'POST\' id=\'modcreateform\'><input name=\'admin\' value=\'true\' type=\'hidden\'><input name=\'operation\' value=\'new\' type=\'hidden\'><table class=\'modlog\' style=\'width:auto\'><tbody><tr><th>Name</th><td><input name=\'title\' type=\'text\'></td></tr><tr><th>Password</th><td><input name=\'password\' type=\'password\'></td></tr></tbody></table><ul style=\'padding:0;text-align:center;list-style:none\'><li><button id=\'modcreate\' type=\'button\' name=\'post\' onclick=\'return false\'>Create Moderator</button></li></ul></form>';

var siteBoardCreateHeader = '<header><h1 id="heading">Board Creation</h1></header>';

var siteBoardCreateForm = '<form method=\'POST\' id=\'createform\'><input name=\'admin\' value=\'true\' type=\'hidden\'><input name=\'operation\' value=\'new\' type=\'hidden\'><input name=\'fileFormats[]\' value=\'jpg\' type=\'hidden\'><input name=\'fileFormats[]\' value=\'png\' type=\'hidden\'><input name=\'fileFormats[]\' value=\'gif\' type=\'hidden\'><table class=\'modlog\' style=\'width:auto\'><tbody><tr><th>Title</th><td><input name=\'title\' type=\'text\'></td></tr><!--<tr><th>Board server</th><td>/ipns/<input name=\'bserver\' type=\'text\' value=\'\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr>--><tr><th>Thread server(s)</th><td>/ipns/<input name=\'threadServers[]\' type=\'text\' value=\'\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr><tr><th>Moderator(s)</th><td>/ipns/<input id=\'mod-register-address\' name=\'mods[]\' type=\'text\' value=\'\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr><tr><th>Banner(s)</th><td>/ipns/<input name=\'banners[]\' type=\'text\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr></tbody></table><ul style=\'padding:0;text-align:center;list-style:none\'><li><button id=\'create\' type=\'button\' name=\'post\' onclick=\'return false\'>Create Board</button></li></ul></form>';//TODO need to have way to put multiple things in each field

var siteAddHeader = '<header><h1 id="heading">Board Registration</h1></header>';

var siteAddForm = '<form method=\'POST\' id=\'postform\'><input name=\'site\' value=\'\' type=\'hidden\'><table class=\'modlog\' style=\'width:auto\'><tbody><tr><th>URI</th><td>/<input name=\'uri\' type=\'text\' size=\'5\'>/ <span class=\'unimportant\'>(must be all lowercase or numbers and &lt; 30 chars)</span></td></tr><tr><th>Address</th><td>/ipns/<input name=\'address\' id=\'board-register-address\' type=\'text\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr></tbody></table><ul style=\'padding:0;text-align:center;list-style:none\'><li><button id=\'submit\' type=\'button\' name=\'post\' onclick=\'return false\'>Register Board</button></li></ul></form>';

var settingsPage = '<header><h1 id="heading">Local Settings</h1></header>';

/* Site HTML (Board list) */

var siteBoardlistHeader = '<header><h1 id="heading">Smugchan</h1></header>';

var siteBoardlist = '<table id=\'boardlist-table\'></table>';

/* Object editor */

var objectEditorHeader = '<header><h1 id="heading">Object Editor</h1></header>';

/* Mod stuff */

var optionsHeader = '<header><h1 id="heading">Mod Management</h1></header>';

var optionsForm = '<form id=\'optionsform\'><input name=\'site\' value=\'\' type=\'hidden\'><table class=\'modlog\' style=\'width:auto\'><tr><th>Address</th><td>/ipns/<input name=\'address\' type=\'text\'>/ <span class=\'unimportant\'>(must be 46 chars)</span></td></tr><tr><th>Password</th><td><input name=\'password\' type=\'password\'></td></tr></table><ul style=\'padding:0;text-align:center;list-style:none\'><li><button id=\'submit\' type=\'button\' name=\'post\' onclick=\'return false\'>Save</button></li></ul></form>';

module.exports.favicon = favicon;
module.exports.css = css;
module.exports.boardlist = boardlist;
module.exports.loadIndicator = loadIndicator;
module.exports.header = header;
module.exports.banner = banner;
module.exports.uploadForm = uploadForm;
module.exports.threadStub = threadStub;
module.exports.catalogStub = catalogStub;
module.exports.threadControls = threadControls;
module.exports.siteModCreateHeader = siteModCreateHeader;
module.exports.siteModCreateForm = siteModCreateForm;
module.exports.siteBoardCreateHeader = siteBoardCreateHeader;
module.exports.siteBoardCreateForm = siteBoardCreateForm;
module.exports.siteAddHeader = siteAddHeader;
module.exports.siteAddForm = siteAddForm;
module.exports.settingsPage = settingsPage;
module.exports.siteBoardlistHeader = siteBoardlistHeader;
module.exports.siteBoardlist = siteBoardlist;
module.exports.objectEditorHeader = objectEditorHeader;
module.exports.optionsHeader = optionsHeader;
module.exports.optionsForm = optionsForm;


