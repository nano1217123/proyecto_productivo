# Usar una versión oficial y ligera de Node.js
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de configuración de dependencias
COPY package*.json ./

# Instalar todas las dependencias necesarias
RUN npm install

# Copiar el resto del código fuente del backend
COPY . .

# Generar el cliente de Prisma para la base de datos de Neon
RUN npx prisma generate

# Exponer el puerto por el que corre tu aplicación (ajusta si es necesario)
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "run", "dev"]