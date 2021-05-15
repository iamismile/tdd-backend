const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Token = sequelize.define(
  'Token',
  {
    token: {
      type: DataTypes.STRING,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'token',
    timestamps: false,
  }
);

module.exports = Token;
