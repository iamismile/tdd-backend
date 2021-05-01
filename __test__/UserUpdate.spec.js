const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  // Create tables for all defined models to the DB if it doesn't exist
  // and does nothing if it already exists
  await sequelize.sync();
});

beforeEach(async () => {
  // To destroy everything in the table
  await User.destroy({ truncate: true });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;

  return await User.create(user);
};

const putUser = async (id, body, options) => {
  const agent = request(app).put('/api/1.0/users/' + id);
  if (options.auth) {
    const { email, password } = options.auth;
    // const merged = `${email}:${password}`;
    // const base64 = Buffer.from(merged).toString('base64');
    // agent.set('Authorization', `Basic ${base64}`);
    agent.auth(email, password);
  }
  return agent.send(body);
};

describe('User Update', () => {
  it('returns 200 ok when valid update request sent from authorized user', async () => {
    const saveduser = await addUser();
    const validUpdate = { username: 'user1-update' };
    const response = await putUser(saveduser.id, validUpdate, {
      auth: { email: saveduser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('updates username in database when valid update request is sent from authorized user', async () => {
    const saveduser = await addUser();
    const validUpdate = { username: 'user1-update' };
    await putUser(saveduser.id, validUpdate, {
      auth: { email: saveduser.email, password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: saveduser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });
});
