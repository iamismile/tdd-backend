const request = require('supertest');
const SMTPServer = require('smtp-server').SMTPServer;
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  // Create SMTP server instances on the fly
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });

      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }

        lastMail = mailBody;
        callback();
      });
    },
  });

  server.listen(8587, 'localhost');

  // Create tables for all defined models to the DB if it doesn't exist
  // and does nothing if it already exists
  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;

  // To destroy everything in the table
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  server.close();
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns errors for both when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  const username_null = 'Username cannot be null';
  const username_size = 'Must have min 4 and max 32 characters';
  const email_null = 'E-mail cannot be null';
  const email_invalid = 'E-mail is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';
  const email_inuse = 'E-mail in use';
  const email_failure = 'E-mail Failure';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${1234567890}      | ${password_pattern}
    ${'password'} | ${'lowerUPPER'}    | ${password_pattern}
    ${'password'} | ${'lower12345'}    | ${password_pattern}
    ${'password'} | ${'UPPER12345'}    | ${password_pattern}
  `('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns ${email_inuse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
  });

  it('returns errors for both username is null and E-mail in use', async () => {
    await User.create({ ...validUser });
    const user = {
      user: null,
      email: validUser.email,
      password: 'P4ssword',
    };
    const response = await postUser(user);
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    expect(lastMail).toContain('user1@mail.com');
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it(`returns ${email_failure} message when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(email_failure);
  });

  it('does not save user to database if sending activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('returns Validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({ ...validUser, username: null });
    expect(response.body.message).toBe('Validation Failure');
  });
});

describe('Internationalization', () => {
  const username_null = 'Kullanıcı adı boş olamaz';
  const username_size = 'En az 4 en fazla 32 karakter olmalı';
  const email_null = 'E-Posta boş olamaz';
  const email_invalid = 'E-Posta geçerli değil';
  const password_null = 'Şifre boş olamaz';
  const password_size = 'Şifre en az 6 karakter olmalı';
  const password_pattern = 'Şifrede en az 1 büyük, 1 küçük harf ve 1 sayı bulunmalıdır';
  const email_inuse = 'Bu E-Posta kullanılıyor';
  const user_create_success = 'Kullanıcı oluşturuldu';
  const email_failure = 'E-Posta gönderiminde hata oluştu';
  const validation_failure = 'Girilen değerler uygun değil';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${1234567890}      | ${password_pattern}
    ${'password'} | ${'lowerUPPER'}    | ${password_pattern}
    ${'password'} | ${'lower12345'}    | ${password_pattern}
    ${'password'} | ${'UPPER12345'}    | ${password_pattern}
  `(
    'returns $expectedMessage when $field is $value when language is set as turkish',
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user, { language: 'tr' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${email_inuse} when same email is already in use when language is set as turkish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'tr' });
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
  });

  it(`returns success message of ${user_create_success} when signup request is valid and language is set as turkish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(user_create_success);
  });

  it(`returns ${email_failure} when sending email fails and language is set as turkish`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(email_failure);
  });

  it(`returns ${validation_failure} message in error response body when validation fails and langiage is set as turkish`, async () => {
    const response = await postUser({ ...validUser, username: null }, { language: 'tr' });
    expect(response.body.message).toBe(validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'tr'}  | ${'wrong'}   | ${'Bu hesap daha önce aktifleştirilmiş olabilir ya da token hatalı'}
    ${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid'}
    ${'tr'}  | ${'correct'} | ${'Hesabınız aktifleştirildi'}
    ${'en'}  | ${'correct'} | ${'Account is activated'}
  `(
    'returns $message when token is $tokenStatus and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-does-not-exist';
      if (tokenStatus === 'correct') {
        const users = await User.findAll();
        token = users[0].activationToken;
      }

      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message, validationErrors in response when validation failure', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp, message in response when request fails other than validation error', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;

    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;

    expect(body.path).toEqual('/api/1.0/users/token/' + token);
  });

  it('returns timestamp in miliseconds within 5 seconds value in error body', async () => {
    const nowInMilis = new Date().getTime();
    const fiveSecondsLater = nowInMilis + 5 * 1000;
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;

    expect(body.timestamp).toBeGreaterThan(nowInMilis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
