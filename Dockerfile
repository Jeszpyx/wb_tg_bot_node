# Используем официальный Node.js образ (LTS)
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект в контейнер
COPY . .

# Ставим права на запись для нужных папок/файлов
RUN chmod -R 777 /app/resources /app/convo-data /app/db.json /app/output

# Собираем TypeScript проект
RUN npm run build

# Указываем команду запуска бота из dist
CMD ["npm", "run", "start"]