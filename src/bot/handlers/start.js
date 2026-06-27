const shop = require('../../shop.config');
const cartService = require('../../services/cart.service');
const { homeMenu } = require('../keyboards');

const HELP_TEXT = [
  '*Available commands*',
  '',
  '/start — Show the storefront menu',
  '/menu — Same as /start',
  '/categories — Browse product categories',
  '/cart — View your cart',
  '/orders — View your past orders',
  '/info — Information (shipping, payment, returns)',
  '/support — Contact support',
  '/help — Show this list',
].join('\n');

async function showHelp(ctx) {
  await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown' });
}

async function getHomeStats(userId) {
  const cart = await cartService.getCartWithItems(userId);
  return {
    cartSummary: {
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      total: cartService.computeTotal(cart),
    },
  };
}

async function showHome(ctx) {
  const { cartSummary } = await getHomeStats(ctx.state.user.id);
  const menuText = shop.mainMenuTitle || 'Choose an option:';
  const menuOpts = {
    ...homeMenu(cartSummary),
  };

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    try {
      if (ctx.callbackQuery.message?.photo) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(menuText, menuOpts);
      } else {
        await ctx.editMessageText(menuText, menuOpts);
      }
      return;
    } catch (_) {
      // Fall back to sending a fresh message below.
    }
  }

  await ctx.reply(`Message from\n${shop.name}\n\n${shop.welcomeText}`);
  await ctx.reply(menuText, menuOpts);
}

function register(bot) {
  bot.start((ctx) => showHome(ctx));
  bot.command('menu', (ctx) => showHome(ctx));
  
  bot.command('shop', (ctx) => showHome(ctx));
  bot.action('shop', (ctx) => showHome(ctx));
  
  bot.action('home', (ctx) => showHome(ctx));
  bot.action('help:menu', (ctx) => showHelp(ctx));
  
  bot.command('help', (ctx) => showHelp(ctx));
}

module.exports = { register, showHome };
