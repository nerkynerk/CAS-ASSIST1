import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.PORT, '0.0.0.0', error => {
  if (error) throw error;
  console.log(`CAS Assist API listening on port ${config.PORT}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping CAS Assist API.`);
  server.close(closeError => {
    process.exit(closeError ? 1 : 0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
