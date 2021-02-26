const app = require('./src/app');
const sequelize = require('./src/config/database');

// Create tables for all defined models to the DB if it doesn't exist
// This creates the table, dropping it first if it already existed
sequelize.sync({ force: true });

app.listen(3000, () => {
  console.log('App is running!');
});
