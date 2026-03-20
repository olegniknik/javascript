const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { AppModule } = require('../dist/src/app.module');
const { configureApp } = require('../dist/src/bootstrap');

const server = express();
let app = null;
let initPromise = null;

async function initApp() {
  if (app) return;
  if (!initPromise) {
    initPromise = (async () => {
      app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        rawBody: true,
      });
      configureApp(app);
      await app.init();
    })();
  }
  await initPromise;
}

module.exports = async (req, res) => {
  try {
    await initApp();
    return server(req, res);
  } catch (error) {
    console.error('Vercel handler init error:', error);
    return res.status(500).json({ message: 'Server initialization failed' });
  }
};
