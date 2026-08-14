FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend ./backend
COPY frontend ./frontend
RUN npm ci
RUN npm run build --workspace backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
EXPOSE 5001
CMD ["node", "backend/dist/server.js"]
