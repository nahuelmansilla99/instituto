FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build --configuration=production

FROM public.ecr.aws/docker/library/nginx:alpine

COPY --from=builder /app/dist/elearning-frontend/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
