#!/usr/bin/env bash
set -e

#git checkout master && git pull origin master

#cp /etc/letsencrypt/live/app.goticket.am/fullchain.pem ./nginx/nginx-selfsigned.crt
#cp /etc/letsencrypt/live/app.goticket.am/privkey.pem ./nginx/nginx-selfsigned.key

docker-compose build --no-cache
docker-compose down
docker-compose up -d
docker system prune -f