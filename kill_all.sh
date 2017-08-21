pkill -F .ipfs/ipfs.pid
pkill -F board/server.pid
pkill -F modconsole/server.pid
pkill -F nameserver/server.pid
pkill -F site/server.pid
pkill -F thread/server.pid

./clean_pids.sh
