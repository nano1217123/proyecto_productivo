# Usar una versión oficial y ligera de Node.js
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de configuración de dependencias
COPY package*.json ./

# Instalar todas las dependencias necesarias
RUN npm ci

# Copiar el resto del código fuente del backend
COPY . .

# Generar el cliente de Prisma para la base de datos de Neon
RUN npx prisma generate --config prisma7.config.ts
RUN npm run build

# Ejecuta el servidor compilado con las opciones de seguridad de producción.
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]