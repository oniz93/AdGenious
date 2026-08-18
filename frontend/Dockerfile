FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend ./frontend
COPY backend ./backend
RUN npm ci
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
