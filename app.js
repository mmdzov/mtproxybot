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

  waitForNewSecretUsername: false,
  usernameSecret: "",
  waitForNewSecretUsernameMsgIds: [],

  waitForNewSecret: false,
  waitForNewSecretMsgIds: [],
});

bot.use(
  session({
    initial,
    storage: new MemorySessionStorage(),
  }),
);

const randomSecret = () => {
  const keys = "1234567890abcdef";

  const chunks = keys.split("");

  const secretNumber = 32;

  const secret = new Array(secretNumber)
    .fill(0)
    .map(() => chunks[Math.floor(Math.random() * chunks.length)])
    .join("");

  return secret;
};

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
  .text("Get Tag", async (ctx) => {
    const stdout = execSync(`${scripts.run} 3`).toString();

    let output = stdout.split(".")[0].split(" ").slice(-1)[0];

    if (!output || !output?.trim()) {
      await ctx.answerCallbackQuery({
        text: "your AD TAG is empty",
      });
      return;
    }

    await ctx.editMessageText(
      `
      Your current AD Tag: <pre>${output}</pre>
            `,
      {
        reply_markup: backToMainMenu,
        parse_mode: "HTML",
      },
    );
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
  })
  .row()
  .text("New secret", (ctx) => {
    ctx.editMessageText(
      `
Please enter the username

Warning! Do not use special characters like " , ' , $ or... for username
`,
      {
        reply_markup: backToMainMenu,
      },
    );

    ctx.session.waitForNewSecretUsername = true;
    ctx.session.waitForNewSecretUsernameMsgIds = [
      ctx.callbackQuery.message.message_id,
    ];
  });

const addSecretMenu = new Menu("add-secret")
  .text(
    "Generate",
    (ctx, next) => ctx.session.waitForNewSecret && next(),
    async (ctx) => {
      const secret = randomSecret();

      const user = ctx.session.usernameSecret;

      const result = execSync(`${scripts.run} 4`, {
        input: `${user}\n${secret}`,
      }).toString();

      const msgId = ctx.callbackQuery.message.message_id;

      try {
        await ctx.deleteMessages([
          msgId,
          ...ctx.session.waitForNewSecretMsgIds,
        ]);
      } catch (e) {}

      try {
        await ctx.reply(`
secret added successfully
<pre>
Username: ${user}
Secret: ${secret}
</pre>
    `);
      } catch (e) {}

      ctx.session.waitForNewSecret = false;
      ctx.session.waitForNewSecretMsgIds = [];

      ctx.reply("Select an option:", {
        reply_markup: mainMenu,
      });

      console.log("from generate secret:", result);
    },
  )
  .back("<< Back", (ctx) => {
    ctx.editMessageText("Select an option:");
  });

bot.use(mainMenu);
bot.use(addSecretMenu);

mainMenu.register(backToMainMenu);
mainMenu.register(addSecretMenu);

bot
  .filter((ctx) => ctx.session.waitForAdTag)
  .on("message", async (ctx) => {
    console.log("from message event");
    const msg = ctx.message?.text;

    const msgId = ctx.message.message_id;

    try {
      await ctx.deleteMessages([msgId, ...ctx.session.waitForAdTagMsgIds]);
    } catch (e) {}

    if (!msg) {
      const res = await ctx.reply("Error: Wrong AD Tag text", {
        reply_markup: backToMainMenu,
      });

      ctx.session.waitForAdTagMsgIds.push(res.message_id);

      return;
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

bot
  .filter((ctx) => ctx.session.waitForNewSecretUsername)
  .on("message", async (ctx) => {
    const msg = ctx.message?.text;

    const msgId = ctx.message.message_id;

    try {
      await ctx.deleteMessages([
        msgId,
        ...ctx.session.waitForNewSecretUsernameMsgIds,
      ]);
    } catch (e) {}

    if (!msg) {
      const res = await ctx.reply("Error: Wrong username text", {
        reply_markup: backToMainMenu,
      });

      ctx.session.waitForNewSecretUsernameMsgIds.push(res.message_id);

      return;
    }

    ctx.session.usernameSecret = msg;

    const res = await ctx.reply(
      `
Please Enter your secret 
Note: secret must have 32 characters consisting of numbers 0-9 and a-f.

You can create your own secret from http://seriyps.ru/mtpgen.html.

You can also generate your secret randomly through the Generate button
    `,
      {
        reply_markup: addSecretMenu,
      },
    );

    ctx.session.waitForNewSecretUsername = false;
    ctx.session.waitForNewSecretUsernameMsgIds = [];

    ctx.session.waitForNewSecret = true;
    ctx.session.waitForNewSecretMsgIds = [res.message_id];

    // const result = execSync(`${scripts.run} 4`, { input: msg }).toString();

    // console.log(result);
  });

bot.command("start", (ctx) => {
  ctx.reply("select an option:", {
    reply_markup: mainMenu,
  });
});

bot.command("reset", (ctx) => {
  waitForAdTag = false;
  waitForAdTagMsgIds = [];

  waitForNewSecretUsername = false;
  usernameSecret = "";
  waitForNewSecretUsernameMsgIds = [];

  waitForNewSecret = false;
  waitForNewSecretMsgIds = [];

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
