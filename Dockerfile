FROM node:15

RUN apt-get update \
    && apt-get install -qq build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY package.json ./
RUN yarn
ENV NODE_PATH=$PWD/node_modules
