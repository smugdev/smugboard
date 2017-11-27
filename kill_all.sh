pkill -F .ipfs/ipfs.pid
pkill -F server/server.pid
pkill -F nameserver/server.pid

./clean_pids.sh
