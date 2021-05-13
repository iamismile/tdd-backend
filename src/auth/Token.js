const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Token = sequelize.define(
  'Token',
  {
    token: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: 'token',
  }
);

module.exports = Token;
