FROM node:22@sha256:9059d9d7db987b86299e052ff6630cd95e5a770336967c21110e53289a877433

WORKDIR /app

COPY package*.json ./

RUN npm install --prefer-offline

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]