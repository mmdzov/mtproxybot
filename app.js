const { Bot } = require("grammy");
const dotenv = require("dotenv");
const { run } = require("@grammyjs/runner");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { exec } = require("child_process");
const { Menu } = require("@grammyjs/menu");
const { join } = require("path");
const { cwd } = require("process");
const parse = require("shell-quote/parse");
const fs = require("fs");

dotenv.config();

let bot;
let scripts = {
  run: "curl -o MTProtoProxyInstall.sh -L https://git.io/fjo34 && bash MTProtoProxyInstall.sh",
};

// if (process.env.NODE_ENV?.includes("development")) {
//     console.log("development mode selected");
//     const socksAgent = new SocksProxyAgent("socks://127.0.0.1:10808");

//     bot = new Bot(process.env.TOKEN, {
//       client: {
//         baseFetchConfig: {
//           agent: socksAgent,
//         },
//       },
//     });
//   } else

bot = new Bot(process.env.TOKEN);

//   const me = await bot.api.getMe();

//   console.log(me);

const mainMenu = new Menu("main-menu").text("View all links", (ctx) => {
  exec(`${scripts.run} 1`, (err, stdout, stderr) => {
    console.log(err, stdout, stderr);
    if (err) {
      console.log(err);
      return;
    }

    console.log(stdout);
  });
});

bot.use(mainMenu);

bot.on("message", (ctx, next) => {
  ctx.reply("bot is alive");

  return next();
});

bot.command("start", (ctx) => {
  ctx.reply("select an option:", {
    reply_markup: mainMenu,
  });
});

bot.catch((err) => {
  console.log(err);
});

const runner = run(bot);

if (runner.isRunning()) console.log("Bot has started :)");

(async () => {
  const me = await bot.api.getMe();
  console.log(me);
})();
