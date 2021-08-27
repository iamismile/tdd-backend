const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

// Create tables for all defined models to the DB if it doesn't exist
// This creates the table, dropping it first if it already existed
// sequelize.sync({ force: true });
sequelize.sync();

TokenService.scheduleCleanup();

logger.error('error');
logger.warn('warn');
logger.info('info');
logger.verbose('verbose');
logger.debug('debug');
logger.silly('silly');

app.listen(3000, () => {
  logger.info('App is running!');
});
