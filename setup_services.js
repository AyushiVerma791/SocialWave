const fs = require('fs');
const path = require('path');

const services = [
  { name: 'api-gateway', port: 4008, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0' } },
  { name: 'auth-service', port: 4001, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3', bcryptjs: '^2.4.3', jsonwebtoken: '^9.0.2' } },
  { name: 'user-service', port: 4002, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3' } },
  { name: 'post-service', port: 4003, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3', multer: '^1.4.5-lts.1', cloudinary: '^1.41.0' } },
  { name: 'feed-service', port: 4004, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0' } },
  { name: 'comment-service', port: 4005, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3' } },
  { name: 'friend-service', port: 4006, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3' } },
  { name: 'notification-service', port: 4007, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3' } },
  { name: 'story-service', port: 4009, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0', mongoose: '^7.6.3', multer: '^1.4.5-lts.1', cloudinary: '^1.41.0' } },
  { name: 'controller-service', port: 4000, deps: { express: '^4.18.2', cors: '^2.8.5', dotenv: '^16.3.1', axios: '^1.6.2', morgan: '^1.10.0' } }
];

const dockerfileContent = (port) => `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE ${port}
CMD ["npm", "start"]
`;

const getDbName = (service) => {
  if (service === 'api-gateway' || service === 'controller-service' || service === 'feed-service') return null;
  return service.replace('-service', '-db');
}

services.forEach(svc => {
  const svcPath = path.join(__dirname, svc.name);
  
  // package.json
  const pkgJson = {
    name: svc.name,
    version: '1.0.0',
    description: `SocialWave ${svc.name}`,
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js'
    },
    dependencies: svc.deps
  };
  fs.writeFileSync(path.join(svcPath, 'package.json'), JSON.stringify(pkgJson, null, 2));

  // Dockerfile
  fs.writeFileSync(path.join(svcPath, 'Dockerfile'), dockerfileContent(svc.port));
  
  console.log(`Generated boilerplate for ${svc.name}`);
});
