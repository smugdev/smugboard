export IPFS_PATH=./.ipfs
ipfs init
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"*\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials "[\"true\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods "[\"PUT\", \"POST\", \"GET\"]"

cd board
npm install
cd ../common
npm install
cd ../thread
npm install
cd ../site
npm install
cd ../modconsole
npm install
cd ../nameserver
npm install
