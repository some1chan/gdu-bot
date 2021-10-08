# ----------------
# Build stage
# ----------------
FROM node:16-alpine as build-stage
WORKDIR /app

# Installs pnpm
RUN npm i -g pnpm

# Installs sqlite3 prerequisite
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3

# Copies pnpm deps
COPY package.json ./
COPY pnpm-lock.yaml ./

# Installs modules
RUN pnpm install 

# Deletes prerequisite
RUN apk del .build-deps

# Copy the rest of the files
COPY . /app

# Builds into dist folder
RUN pnpm build

# ----------------
# Production stage
# ----------------
FROM node:16-alpine as production-stage
WORKDIR /app

# Installs pnpm
RUN npm i -g pnpm

# Copies pnpm deps
COPY package.json ./
COPY pnpm-lock.yaml ./

# Installs modules for the final time
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3
RUN pnpm install --production 
RUN apk del .build-deps

# Copies package.json files and built files
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/dist/ /app/dist/

# Starts the app
EXPOSE 42069
CMD ["npm", "start"]