const path = require('path');
const express = require('express');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const config = require('config');
const errorHandler = require('./error/ErrorHandler');
const UserRouter = require('./user/UserRouter');
const AuthenticationRouter = require('./auth/AuthenticationRouter');
const tokenAuthentication = require('./middleware/tokenAuthentication');
const FileService = require('./file/FileService');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

const ONE_YEAR_IN_MILLIS = 365 * 24 * 60 * 60 * 1000;

const app = express();

// Internationalization
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

FileService.createFolders();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use('/images', express.static(profileFolder, { maxAge: ONE_YEAR_IN_MILLIS }));

app.use(tokenAuthentication);

app.use(UserRouter);
app.use(AuthenticationRouter);

app.use(errorHandler);

module.exports = app;
