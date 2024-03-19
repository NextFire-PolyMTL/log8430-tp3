#!/bin/sh -e
IMAGE=ghcr.io/jaconi-io/ycsb:0.17.0-latest

NETWORK=$1
if [ -z "$NETWORK" ]; then
  echo "Usage: $0 <network> <ycsb_args...>"
  exit 1
fi
shift

set -x
exec docker run --rm --net $NETWORK -w /opt/ycsb/ $IMAGE ycsb $@
