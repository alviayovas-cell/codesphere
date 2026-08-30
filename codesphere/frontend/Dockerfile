# CodeSphere frontend - builds the static Vite bundle, then serves it with
# nginx. VITE_API_URL is baked in at BUILD time (Vite inlines
# import.meta.env.* into the bundle), so it must be passed as a build arg
# pointing at wherever the backend is actually reachable from the browser -
# not the docker-compose service name, a real public URL:
#   docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api .
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
