FROM node:22-alpine

WORKDIR /app

# Pin pnpm to 10.10.0 for stable build execution
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

COPY package.json ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
