const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Social Platform API',
      version: '1.0.0',
      description: 'A comprehensive social platform API with user management, profiles, and matchmaking features',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./app.js', './Controller/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

// Write the swagger document to a file
const swaggerPath = path.join(__dirname, 'swagger-output.json');
fs.writeFileSync(swaggerPath, JSON.stringify(specs, null, 2));

console.log('Swagger documentation generated successfully at:', swaggerPath);
