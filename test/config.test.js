const test = require('node:test');
const assert = require('node:assert/strict');

const configPath = require.resolve('../src/config');

function loadConfig(env) {
  const previous = { ...process.env };
  Object.assign(process.env, {
    BOT_TOKEN: 'test-token',
    ADMIN_ID: '1',
    WEBHOOK_DOMAIN: '',
    DOKPLOY_DEPLOY_URL: '',
    RENDER_EXTERNAL_URL: '',
    RENDER_EXTERNAL_HOSTNAME: '',
    ...env,
  });
  delete require.cache[configPath];
  const config = require(configPath);
  process.env = previous;
  return config;
}

test('uses the Render hostname when WEBHOOK_DOMAIN is empty', () => {
  const config = loadConfig({
    RENDER_EXTERNAL_HOSTNAME: 'sam-example.onrender.com',
  });

  assert.equal(config.webhook.domain, 'https://sam-example.onrender.com');
});

test('prefers an explicitly configured webhook domain', () => {
  const config = loadConfig({
    WEBHOOK_DOMAIN: 'https://bot.example.com/',
    RENDER_EXTERNAL_HOSTNAME: 'sam-example.onrender.com',
  });

  assert.equal(config.webhook.domain, 'https://bot.example.com');
});

test('uses the full Render URL when available', () => {
  const config = loadConfig({
    RENDER_EXTERNAL_URL: 'https://sam-example.onrender.com/',
    RENDER_EXTERNAL_HOSTNAME: 'ignored.onrender.com',
  });

  assert.equal(config.webhook.domain, 'https://sam-example.onrender.com');
});

test('adds https to a configured hostname', () => {
  const config = loadConfig({
    WEBHOOK_DOMAIN: 'bot.example.com/',
  });

  assert.equal(config.webhook.domain, 'https://bot.example.com');
});

test('uses the Dokploy deployment URL when no domain is configured', () => {
  const config = loadConfig({
    DOKPLOY_DEPLOY_URL: 'https://sam-preview.example.com/',
  });

  assert.equal(config.webhook.domain, 'https://sam-preview.example.com');
});
