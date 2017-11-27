#set up servers (start_all.sh must be run first)
export IPFS_PATH=./.ipfs

#create server object
server=$(node scripts/createserver.js)
echo "Server address: $server"

#create site mod
sitemod=$(node scripts/createmod.js $server)
echo "Site global moderator: $sitemod"

#create site
site=$(node scripts/createsite.js $server $sitemod)
echo "Site address: $site"

#get public client
client=$(browserify client/smugchan.js > client/bundle.js && ipfs add -rq client | tail -n1)
echo "Client address: /ipfs/$client"
echo "Complete link: http://localhost:8080/ipfs/$client/#$site"

#create and add boards
./populate_boards.sh $server $site

#create board mod
#boardmod=$(node scripts/createmod.js $server)

#create board
#board=$(node scripts/createboard.js $server $boardmod $server)





#echo "Board address: $board"
#echo "Board moderator: $boardmod"

