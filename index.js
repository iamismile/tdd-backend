const app = require('./src/app');
const sequelize = require('./src/config/database');

// Create tables for all defined models to the DB if it doesn't exist
// and does nothing if it already exists
sequelize.sync();

app.listen(3000, () => {
  console.log('App is running!');
});
