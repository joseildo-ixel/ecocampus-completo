FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ \
  && corepack enable \
  && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "start:prod"]
