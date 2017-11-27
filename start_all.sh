IPFS_PATH=./.ipfs ipfs daemon &
echo $! > .ipfs/ipfs.pid
cd nameserver
node namemanager.js >> log.txt &
echo $! > server.pid
sleep 10s #TODO find a better way of working out when ipfs is all set up
#echo "now starting other stuff"
cd ../server
node server.js >> log.txt &
echo $! > server.pid
