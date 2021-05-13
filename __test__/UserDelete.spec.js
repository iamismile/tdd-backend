const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

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

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const { email, password } = options.auth;
    const response = await request(app).post('/api/1.0/auth').send({ email, password });
    token = response.body.token;
  }
  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete('/api/1.0/users/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send();
};

describe('User Delete', () => {
  it('returns forbidden when request sent unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthroized_user_delete}
    ${'en'}  | ${en.unauthroized_user_delete}
  `(
    'returns error body with $message for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });
      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeDeleted = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const response = await deleteUser(userToBeDeleted.id, { token });
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is not valid', async () => {
    const savedUser = await addUser();
    const response = await deleteUser(savedUser.id, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when valid delete request sent from authorized user', async () => {
    const saveduser = await addUser();
    const token = await auth({
      auth: { email: saveduser.email, password: 'P4ssword' },
    });
    const response = await deleteUser(saveduser.id, { token });
    expect(response.status).toBe(200);
  });

  it('deletes user from database when request is sent from authorized user', async () => {
    const saveduser = await addUser();
    const token = await auth({
      auth: { email: saveduser.email, password: 'P4ssword' },
    });
    await deleteUser(saveduser.id, { token });

    const inDBUser = await User.findOne({ where: { id: saveduser.id } });
    expect(inDBUser).toBeNull();
  });
});
