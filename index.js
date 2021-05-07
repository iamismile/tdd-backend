const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const bcrypt = require('bcrypt');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

// Create tables for all defined models to the DB if it doesn't exist
// This creates the table, dropping it first if it already existed
// sequelize.sync({ force: true });
sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

app.listen(3000, () => {
  console.log('App is running!');
});
