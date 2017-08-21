rm -rf .ipfs
rm -rf board/node_modules
rm -rf common/node_modules
rm -rf thread/node_modules
rm -rf site/node_modules
rm -rf modconsole/node_modules
rm -rf nameserver/node_modules

./clean_content.sh
./clean_logs.sh
./clean_pids.sh
