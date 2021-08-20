const sequelize = require('../src/config/database');
const Token = require('../src/auth/Token');
const TokenService = require('../src/auth/TokenService');

beforeAll(async () => {
  // Create tables for all defined models to the DB if it doesn't exist
  // and does nothing if it already exists
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  // To destroy everything in the table
  await Token.destroy({ truncate: true });
});

describe('Scheduled Token Cleanup', () => {
  it('clears the expired token with scheduled task', async () => {
    jest.useFakeTimers();

    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      lastUsedAt: eightDaysAgo,
    });

    TokenService.scheduleCleanup();

    jest.advanceTimersByTime(60 * 60 * 1000 + 5000);

    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB).toBeNull();
  });
});
