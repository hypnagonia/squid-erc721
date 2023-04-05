FROM node:18.12.1-alpine

RUN apk add --no-cache openssl
RUN apk add python3 make gcc g++

WORKDIR /usr/src/
COPY . .

RUN npm i -g @subsquid/cli
RUN npm i
RUN npm run build

CMD ["sqd", "process"]
