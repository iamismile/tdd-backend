const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');
const logger = require('../shared/logger');

const sendAccountActivaion = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
      <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${token}">Activate</a>
    </div>
    `,
  });

  if (process.env.NODE_ENV === 'development') {
    logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  }
};

const sendPasswordReset = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@may-app.com',
    to: email,
    subject: 'Password Reset',
    html: `
    <div>
      <b>Please click below link to reset your password</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/password-reset?reset=${token}">Reset</a>
    </div>
    `,
  });

  if (process.env.NODE_ENV === 'development') {
    logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendAccountActivaion, sendPasswordReset };
