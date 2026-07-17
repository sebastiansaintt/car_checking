FROM node:21.1-alpine

WORKDIR /workspace

# Copiar archivos de dependencias
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

EXPOSE 5173

# Correr el servidor de desarrollo exponiendo el host para docker
CMD ["npm", "run", "dev", "--", "--host"]
