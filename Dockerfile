FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY --from=oven/bun:1.3.9 /usr/local/bin/bun /usr/local/bin/bun

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY eslint.config.ts ./
COPY index.ts ./
COPY .env.example ./
COPY README.md ./
COPY PLAN.md ./

RUN bun run build

ENV NODE_ENV="production"
ENV HTTP_HOST="0.0.0.0"
ENV HTTP_PORT="3022"
ENV OUTPUT_BASE_DIR="/data/runs"
ENV CHROME_USER_DATA_DIR="/data/chrome-profile"
ENV CHROME_PROFILE_DIRECTORY="Default"

EXPOSE 3022

CMD ["bash", "-lc", "Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp & export DISPLAY=:99 && exec bun dist/src/index.js"]
