const { Bot, session, MemorySessionStorage } = require("grammy");
const dotenv = require("dotenv");
const { run } = require("@grammyjs/runner");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { exec, execSync } = require("child_process");
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

const initial = () => ({
  waitForAdTag: false,
  waitForAdTagMsgIds: [],
});

bot.use(
  session({
    initial,
    storage: new MemorySessionStorage(),
  }),
);

const backToMainMenu = new Menu("back-to-main").back("<< Back", (ctx) => {
  ctx.editMessageText("select an option:");
});

bot.use(backToMainMenu);

const mainMenu = new Menu("main-menu")
  .text("View all links", (ctx) => {
    exec(`${scripts.run} 1`, async (err, stdout, stderr) => {
      console.log(err, stdout, stderr);
      if (err) {
        console.log(err);
        return;
      }

      let output = stdout.split("\n");

      output.shift();

      output = output.join("\n");

      await ctx.editMessageText(output, {
        reply_markup: backToMainMenu,
      });
    });
  })
  .row()
  .text("Get Tag", (ctx) => {
    exec(`${scripts.run} 3`, async (err, stdout, stderr) => {
      console.log(err, stdout, stderr);
      if (err) {
        console.error(err);
        return;
      }

      let output = stdout.split(".")[0].split(" ").slice(-1)[0];

      ctx.reply(stdout);

      //   if (!output?.trim()) {
      //     await ctx.answerCallbackQuery({
      //       text: "your AD TAG is empty",
      //     });
      //     return;
      //   }

      //   await ctx.editMessageText(
      //     `
      // Your current AD Tag: <pre>${output}</pre>
      //       `,
      //     {
      //       reply_markup: backToMainMenu,
      //       parse_mode: "HTML",
      //     },
      //   );
    });
  })
  .text("New Tag", async (ctx) => {
    const res = await ctx.editMessageText(
      "Send me your AD Tag that you received from @mtproxybot",
      {
        reply_markup: backToMainMenu,
      },
    );

    ctx.session.waitForAdTag = true;
    waitForAdTagMsgIds = [ctx.callbackQuery.message.message_id, res.message_id];
  });

mainMenu.register(backToMainMenu);

bot.use(mainMenu);

bot
  .filter((ctx) => ctx.session.waitForAdTag)
  .on("message", async (ctx) => {
    const msg = ctx.message?.text;

    const msgId = ctx.message.message_id;

    try {
      await ctx.deleteMessages([msgId, ...ctx.session.waitForAdTagMsgIds]);
    } catch (e) {}

    if (!msg) {
      const res = await ctx.reply("Error: Wrong AD Tag text", {
        reply_markup: backToMainMenu,
      });

      res.message_id;

      ctx.session.waitForAdTagMsgIds.push(res.message_id);
    }

    const result = execSync(`${scripts.run} 3`, { input: msg }).toString();

    // let isDone = result.includes("Done");

    // if (isDone) {
    await ctx.reply(
      `New AD Tag has been successfully added. your new AD Tag: <pre>${msg}</pre>`,
      {
        parse_mode: "HTML",
      },
    );

    ctx.reply("Select as option:", {
      reply_markup: mainMenu,
    });

    ctx.session.waitForAdTag = false;
    ctx.session.waitForAdTagMsgIds = [];

    // return;
    // }
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
