FROM node:16-bullseye as base
RUN apt update && apt install -y --no-install-recommends vim-tiny && rm -rf /var/lib/apt/lists/*

FROM base as modules
WORKDIR /app

ADD ./patches ./patches
COPY package.json yarn.lock ./
RUN npm config set python /usr/bin/python3
RUN yarn install && yarn cache clean

FROM base
WORKDIR /app
COPY --from=modules /app/node_modules /app/node_modules
COPY . .

RUN yarn build

EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000/
CMD ["yarn", "start"]
