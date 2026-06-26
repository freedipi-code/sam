const prisma = require('../../db/client');
const shop = require('../../shop.config');
const cartService = require('../../services/cart.service');
const { mainCategoriesKeyboard, subCategoriesKeyboard } = require('../keyboards');
const { showCatalog } = require('./catalog');

async function getCartSummary(userId) {
  const cart = await cartService.getCartWithItems(userId);
  return {
    count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    total: cartService.computeTotal(cart),
  };
}

async function showRootCategories(ctx) {
  const [categories, cartSummary] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { children: true, products: true } },
      },
    }),
    getCartSummary(ctx.state.user.id),
  ]);

  const text = shop.categoriesTitle || '📁 Main Categories\n\nChoose a category:';
  const opts = {
    ...mainCategoriesKeyboard(categories, cartSummary),
  };

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    try {
      if (ctx.callbackQuery.message?.photo) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, opts);
      } else {
        await ctx.editMessageText(text, opts);
      }
      return;
    } catch (_) {
      // Fall back to sending a fresh message below.
    }
  }

  return ctx.reply(text, opts);
}

async function showCategory(ctx) {
  const categoryId = Number(ctx.match[1]);
  const [category, cartSummary] = await Promise.all([
    prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        children: {
          orderBy: { id: 'asc' },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { children: true, products: true } },
      },
    }),
    getCartSummary(ctx.state.user.id),
  ]);

  if (!category) {
    await ctx.answerCbQuery('Category not found').catch(() => {});
    return;
  }

  if (!category.children.length && category._count.products > 0) {
    return showCatalog(ctx, 0, String(category.id));
  }

  const pathLines = [
    `📁 ${category.name.toUpperCase()}`,
    '',
    'Navigation Path:',
    '• Categories',
  ];

  if (category.parent) {
    pathLines.push(`  └── ${category.parent.name.toUpperCase()}`);
    pathLines.push(`      └── ${category.name.toUpperCase()} ↩️`);
  } else {
    pathLines.push(`  └── ${category.name.toUpperCase()} ↩️`);
  }

  pathLines.push('');
  pathLines.push(shop.categoryHeader || 'Choose a subcategory:');

  const opts = {
    ...subCategoriesKeyboard(category, cartSummary),
  };

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    try {
      if (ctx.callbackQuery.message?.photo) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(pathLines.join('\n'), opts);
      } else {
        await ctx.editMessageText(pathLines.join('\n'), opts);
      }
      return;
    } catch (_) {
      // Fall back to sending a fresh message below.
    }
  }

  return ctx.reply(pathLines.join('\n'), opts);
}

function register(bot) {
  bot.action('categories:root', showRootCategories);
  bot.command('categories', showRootCategories);
  bot.action(/^cat:view:(\d+)$/, showCategory);

  bot.action(/^cat:root:(.+)$/, async (ctx) => {
    return showRootCategories(ctx);
  });
  bot.action(/^cat:(\d+)$/, async (ctx) => {
    const catId = ctx.match[1];
    ctx.match[1] = catId;
    return showCategory(ctx);
  });
}

module.exports = { register, showRootCategories, showCategory };
