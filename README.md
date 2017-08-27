# Smugboard
An IPFS-based imageboard.

## Prerequisites
* Node

* Browserify

* go-ipfs

* eslint (if you want to contribute)

## Setup
```
./install_all.sh
./start_all.sh
./setup.sh
```

## Usage

The site can be accessed from any local go-ipfs daemon, provided that it is configured with 
```
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"*\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials "[\"true\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods "[\"PUT\", \"POST\", \"GET\"]"
```
beforehand. Then, simply visit the link as output by setup.sh.
