# Используем официальный Node.js образ на основе Alpine (маленький размер)
FROM node:22-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm i

# Копируем исходники
COPY . .

# Собираем TypeScript
RUN npm run build

# Финальный образ
FROM node:22-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем необходимые системные зависимости (для pdf-merger-js и xlsx)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Копируем собранные файлы из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Копируем только нужные зависимости
COPY --from=builder /app/node_modules ./node_modules

# Создаем директории для данных и даем полные права
RUN mkdir -p /app/resources /app/convo-data /app/output && \
    chmod -R 777 /app/resources /app/convo-data /app/output

# Запускаем приложение от root (простое решение)
# Если хотите безопаснее - раскомментируйте строки ниже и закомментируйте USER root
# RUN adduser -D -u 1000 hleb && \
#     chown -R hleb:hleb /app
# USER hleb

CMD ["node", "dist/main.js"]