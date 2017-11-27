rm -rf .ipfs
rm -rf common/node_modules
rm -rf nameserver/node_modules
rm -rf server/node_modules

./clean_content.sh
./clean_logs.sh
./clean_pids.sh
