const swaggerAutogen = require("swagger-autogen")();

const outputFile = "./swagger-output.json"; // Output file for the spec
const routes = ["./mapserver.js"]; // Path to your API route files

const doc = {
  info: {
    title: "Map API",
    description: "API for managing locations and routes on the map application",
  },
  host: "localhost:3000", // Replace with your actual host if needed
};

swaggerAutogen(outputFile, routes, doc);
