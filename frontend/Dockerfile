FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
# Work around intermittent esbuild ETXTBSY during npm ci in Docker Desktop.
# Install without lifecycle scripts first, then rebuild esbuild explicitly.
RUN npm ci --no-audit --no-fund --ignore-scripts \
  && npm rebuild esbuild \
  && npm rebuild \
  && npm run postinstall --if-present

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
