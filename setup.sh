#set up servers (start_all.sh must be run first)
export IPFS_PATH=./.ipfs

#get threadserver id
threadkey=$(ls thread/states | head -n1)
echo "module.exports.serverAddress = '$threadkey';" > common/current_thread.js
threadkey=$(echo /ipns/$threadkey)

#create site mod
sitemod=$(node modconsole/createmod.js)

#create site
site=$(node site/createsite.js $sitemod)

#create board mod
boardmod=$(node modconsole/createmod.js)

./populate_boards.sh $threadkey $site

#create board
#board=$(node board/createboard.js $boardmod $threadkey "Random")

#add board to site
#res=$(node site/addboardtosite.js $site $board b)

#get public client
client=$(browserify client/smugchan.js > client/bundle.js && ipfs add -rq client | tail -n1)

echo "Site address: $site"
echo "Site global moderator: $sitemod"
#echo "Board address: $board"
#echo "Board moderator: $boardmod"
echo "Thread server address: $threadkey"
echo "Client address: /ipfs/$client"
echo "Complete link: http://localhost:8080/ipfs/$client/#$site"
