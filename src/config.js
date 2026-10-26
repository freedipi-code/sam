require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

function resolveWebhookDomain() {
  const configuredDomain = process.env.WEBHOOK_DOMAIN?.trim();
  if (configuredDomain) {
    const domain = /^https?:\/\//i.test(configuredDomain)
      ? configuredDomain
      : `https://${configuredDomain}`;
    return domain.replace(/\/$/, '');
  }

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl) return renderUrl.replace(/\/$/, '');

  const renderHostname = process.env.RENDER_EXTERNAL_HOSTNAME?.trim();
  if (renderHostname) return `https://${renderHostname.replace(/\/$/, '')}`;

  return '';
}

const config = {
  botToken: required('BOT_TOKEN'),
  adminId: required('ADMIN_ID'),
  mode: process.env.BOT_MODE || 'polling', // 'polling' | 'webhook'
  webhook: {
    // Render provides RENDER_EXTERNAL_HOSTNAME automatically. Keeping
    // WEBHOOK_DOMAIN as an override also supports custom domains.
    domain: resolveWebhookDomain(),
    path: process.env.WEBHOOK_PATH || '/api/telegram/webhook',
    secret: process.env.WEBHOOK_SECRET || '',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  wallets: {
    btc: process.env.BTC_WALLET || '',
    ltc: process.env.LTC_WALLET || '',
  },
};

module.exports = config;
