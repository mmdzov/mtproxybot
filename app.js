const { Bot, session, MemorySessionStorage } = require("grammy");
const dotenv = require("dotenv");
const { run } = require("@grammyjs/runner");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { exec, execSync } = require("child_process");
const { Menu, MenuRange } = require("@grammyjs/menu");
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

const revokeSecretMenu = new Menu("revoke-secret")
  .dynamic(async (dctx) => {
    const proxies = execSync(`${scripts.run} 1`).toString();

    if (!proxies || !proxies?.trim()) {
      await dctx.answerCallbackQuery({
        text: "There is no secret yet",
      });
      return;
    }

    const users = proxies
      .split("\n")
      .filter((item) => item)
      .slice(1)
      .map((item) => item.split(" ")[0].split(":").join(""));

    const range = new MenuRange();

    for (let i in users) {
      const user = users[i];

      range
        .text(user, async (ctx) => {
          console.log(i, i + 1);

          const result = execSync(`${scripts.run}`, {
            input: `5\n${i + 1}\n`,
            shell: "/bin/bash",
          }).toString();

          try {
            await ctx.answerCallbackQuery({
              text: "successfully revoked",
            });
          } catch (e) {}

          ctx.editMessageText("Select an option:", {
            reply_markup: mainMenu,
          });
        })
        .row();
    }

    return range;
  })
  .row()
  .back("<< Back", (ctx) => {
    ctx.editMessageText("select an option:");
  });

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

    if (!output || !output?.trim() || output.includes("empty")) {
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
  .text("Revoke secret", (ctx) => {
    ctx.editMessageText("select a user", {
      reply_markup: revokeSecretMenu,
    });
  })
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
  .back("<< Back", (ctx) => {
    ctx.editMessageText("Select an option:");
  })
  .text(
    "Generate",
    (ctx, next) => ctx.session.waitForNewSecret && next(),
    async (ctx) => {
      const secret = randomSecret();

      const user = ctx.session.usernameSecret;

      console.log(user, secret);

      const result = execSync(`${scripts.run} 4`, {
        input: `${user}\n1\n${secret}\n`,
      }).toString();

      const msgId = ctx.callbackQuery.message.message_id;

      try {
        await ctx.deleteMessages([
          msgId,
          ...ctx.session.waitForNewSecretMsgIds,
        ]);
      } catch (e) {}

      try {
        await ctx.reply(
          `
Secret added successfully
<pre>
Username: ${user}
Secret: ${secret}
</pre>
    `,
          {
            parse_mode: "HTML",
          },
        );
      } catch (e) {}

      ctx.session.waitForNewSecret = false;
      ctx.session.waitForNewSecretMsgIds = [];
      ctx.session.usernameSecret = "";

      ctx.reply("Select an option:", {
        reply_markup: mainMenu,
      });

      console.log("from generate secret:", result);
    },
  );

bot.use(revokeSecretMenu);
bot.use(mainMenu);
bot.use(addSecretMenu);

mainMenu.register(backToMainMenu);
mainMenu.register(addSecretMenu);
mainMenu.register(revokeSecretMenu);

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

You can create your own secret from http://seriyps.ru/mtpgen.html

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

bot
  .filter((ctx) => ctx.session.waitForNewSecret)
  .on("message", async (ctx) => {
    const msg = ctx.message?.text;
    const pattern = /^[0-9a-f]{32}$/g;

    const msgId = ctx.message.message_id;

    try {
      await ctx.deleteMessages([msgId, ...ctx.session.waitForNewSecretMsgIds]);
    } catch (e) {}

    if (!msg || !pattern.test(msg)) {
      const res = await ctx.reply(
        `
Error: Wrong secret text or pattern

Note: secret must have 32 characters consisting of numbers 0-9 and a-f.
`,
        {
          reply_markup: addSecretMenu,
        },
      );

      ctx.session.waitForNewSecretMsgIds.push(res.message_id);

      return;
    }
    const user = ctx.session.usernameSecret;

    console.log(user, msg);

    const result = execSync(`${scripts.run} 4`, {
      input: `${user}\n1\n${msg?.trim()}\n`,
    }).toString();

    try {
      await ctx.reply(
        `
  Secret added successfully
  <pre>
  Username: ${user}
  Secret: ${msg?.trim()}
  </pre>
      `,
        {
          parse_mode: "HTML",
        },
      );
    } catch (e) {}

    ctx.session.waitForNewSecret = false;
    ctx.session.waitForNewSecretMsgIds = [];
    ctx.session.usernameSecret = "";

    ctx.reply("Select an option:", {
      reply_markup: mainMenu,
    });
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
