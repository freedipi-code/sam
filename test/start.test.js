const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BOT_TOKEN ||= 'test-token';
process.env.ADMIN_ID ||= '1';

const cartServicePath = require.resolve('../src/services/cart.service');
require.cache[cartServicePath] = {
  id: cartServicePath,
  filename: cartServicePath,
  loaded: true,
  exports: {
    getCartWithItems: async () => {
      throw new Error('The database should not be queried by /start');
    },
    computeTotal: () => 0,
  },
};

const { showHome } = require('../src/bot/handlers/start');

test('/start renders the home menu without a database user', async () => {
  const replies = [];
  const ctx = {
    state: {},
    reply: async (text, options) => replies.push({ text, options }),
  };

  await showHome(ctx);

  assert.equal(replies.length, 2);
  assert.match(replies[0].text, /^Message from/);
  assert.ok(replies[1].options.reply_markup.inline_keyboard.length > 0);
});
