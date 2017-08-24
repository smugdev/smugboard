IPFS_PATH=./.ipfs ipfs daemon &
echo $! > .ipfs/ipfs.pid
cd nameserver
node namemanager.js >> log.txt &
echo $! > server.pid
sleep 10s #TODO find a better way of working out when ipfs is all set up
#echo "now starting other stuff"
cd ../board
node boardmanager.js >> log.txt &
echo $! > server.pid
cd ../thread
node threadmanager.js >> log.txt &
echo $! > server.pid
cd ../site
node sitemanager.js >> log.txt &
echo $! > server.pid
cd ../modconsole
node modmanager.js >> log.txt &
echo $! > server.pid
