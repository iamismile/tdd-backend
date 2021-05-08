const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Token = sequelize.define(
  'Token',
  {
    token: {
      type: DataTypes.STRING,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: 'token',
  }
);

module.exports = Token;
