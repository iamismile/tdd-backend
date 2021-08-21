module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './prod-db.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'trey.wiegand90@ethereal.email',
      pass: '3je7UauY9rQqM5tTch',
    },
  },
  uploadDir: 'uploads-production',
  profileDir: 'profile',
};
