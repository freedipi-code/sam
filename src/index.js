const express = require('express');
const path = require('path');
const config = require('./config');
const bot = require('./bot/bot');
const adminRouter = require('./bot/admin.router');

let httpServer;
let webhookRetryTimer;
let webhookReady = false;

const WEBHOOK_RETRY_MS = 10_000;

function setupExpressApp(app) {
  // Mount admin API routes
  app.use('/api/admin', adminRouter);
  // Serve admin static dashboard
  app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
  // Health check
  app.get('/health', (_req, res) => res.json({
    ok: true,
    mode: config.mode,
    webhookReady: config.mode === 'webhook' ? webhookReady : undefined,
  }));
}

async function registerWebhook(url) {
  try {
    await bot.telegram.setWebhook(url, {
      secret_token: config.webhook.secret || undefined,
      drop_pending_updates: false,
    });
    const me = await bot.telegram.getMe();
    bot.botInfo = me;
    webhookReady = true;
    console.log(`🤖 Bot lancé en mode WEBHOOK — @${me.username}`);
    console.log(`   URL configurée : ${url}`);
  } catch (error) {
    webhookReady = false;
    console.error(
      `Échec de l'enregistrement du webhook; nouvel essai dans ${WEBHOOK_RETRY_MS / 1000}s :`,
      error.message,
    );
    webhookRetryTimer = setTimeout(() => {
      webhookRetryTimer = undefined;
      void registerWebhook(url);
    }, WEBHOOK_RETRY_MS);
  }
}

async function startPolling() {
  await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  const me = await bot.telegram.getMe();
  console.log(`🤖 Bot lancé en mode POLLING (dev) — @${me.username}`);
  
  // Start Express for admin dashboard in development/polling
  const app = express();
  setupExpressApp(app);
  const port = config.webhook.port || 3000;
  httpServer = app.listen(port, '0.0.0.0', () => {
    console.log(`📊 Admin Dashboard disponible sur http://localhost:${port}/admin`);
  });

  await bot.launch();
}

async function startWebhook() {
  if (!config.webhook.domain) {
    throw new Error('WEBHOOK_DOMAIN est requis en mode webhook');
  }
  const app = express();
  const url = config.webhook.domain.replace(/\/$/, '') + config.webhook.path;

  setupExpressApp(app);

  // Bind the HTTP port before contacting Telegram. This lets Render observe a
  // healthy service even if Telegram's API is temporarily slow to respond.
  app.use(bot.webhookCallback(config.webhook.path, {
    secretToken: config.webhook.secret || undefined,
  }));

  await new Promise((resolve, reject) => {
    httpServer = app.listen(config.webhook.port, '0.0.0.0', resolve);
    httpServer.once('error', reject);
  });

  console.log(`🌐 Serveur HTTP lancé sur le port ${config.webhook.port}`);
  console.log('📊 Admin Dashboard disponible sur /admin');

  // Telegram can be temporarily unavailable while Render is starting. Keep
  // the HTTP service alive and retry instead of crashing the whole process.
  void registerWebhook(url);
}

(async () => {
  try {
    if (config.mode === 'webhook') {
      await startWebhook();
    } else {
      await startPolling();
    }
  } catch (e) {
    console.error('Échec du démarrage du bot :', e);
    process.exit(1);
  }
})();

// Arrêt propre. In webhook mode Telegraf does not own the Express server, so
// bot.stop() must only be called for polling.
function shutdown(signal) {
  if (webhookRetryTimer) clearTimeout(webhookRetryTimer);
  if (config.mode !== 'webhook') {
    try { bot.stop(signal); } catch (_) {}
  }
  if (httpServer) httpServer.close();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
