# Deployment and Maintenance

## Deployment

1.  **Prerequisites**: Ensure you have Node.js and npm installed on your server.
2.  **Clone the repository**: `git clone <repository_url>`
3.  **Install dependencies**: `npm install`
4.  **Configure environment variables**: Create a `.env` file in the root of the project and add the necessary environment variables (e.g., `PORT`, `NODE_ENV`).
5.  **Start the server**: `npm start`

## Maintenance

*   **Updating dependencies**: Regularly run `npm audit` to check for vulnerabilities and `npm outdated` to see which packages can be updated. Use `npm update` to update packages.
*   **Backups**: Regularly back up the `survey-data.json` file and any other critical data.
*   **Monitoring**: Monitor the server for errors and performance issues. The logs will be printed to the console where the server is running.
*   **API Documentation**: To update the API documentation, modify the JSDoc comments in the route files and then run `node swagger.js` to regenerate the `swagger-output.json` file. The documentation is available at `/api-docs`.