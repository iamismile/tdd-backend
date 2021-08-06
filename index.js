const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');

// Create tables for all defined models to the DB if it doesn't exist
// This creates the table, dropping it first if it already existed
// sequelize.sync({ force: true });
sequelize.sync();

TokenService.scheduleCleanup();

app.listen(3000, () => {
  console.log('App is running!');
});
