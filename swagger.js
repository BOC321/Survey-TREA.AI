const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Survey API',
    description: 'API documentation for the survey application'
  },
  host: 'localhost:3003',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/api.js', './routes/survey.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);