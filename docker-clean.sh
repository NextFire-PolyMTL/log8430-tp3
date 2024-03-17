#!/bin/sh -x
docker rm -f $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker network rm $(docker network ls -q --filter type=custom)
exit 0
