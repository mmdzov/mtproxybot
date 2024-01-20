# Mtproxybot

Manage your mtproto proxies in Telegram bot

## Installation
1. Install the [MTProtoProxyInstaller](https://github.com/HirbodBehnam/MTProtoProxyInstaller) project
2. Install the Node.js
```bash
sudo apt update && sudo apt install curl -y
```
```bash
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash 
```
```bash
source ~/.bashrc  
```
```bash
nvm install v20.10.0  
```
```bash
nvm install node 
```
3. Clone this project in the root of your server
```bash
git clone https://github.com/mmdzov/mtproxybot.git
```
4. Install pm2 globally
```bash
npm i pm2 -g
```
5. Go to the project path
```bash
cd mtproxybot
```
6. Install the dependencies
```bash
npm i
```
7. Change .env.example to .env
```bash
mv .env.example .env
```
8. Build your bot on `@botfather` and keep the token with you

9. Get your user ID from the `@userinfobot` bot and keep it with you

10. Open the .env file with nano
```bash
nano .env
```
11. Put the values ​​received in 8 and 9 in front of =
```
TOKEN=YOUR_BOT_TOKEN

USER_IDS=YOUR_USER_ID
```
12. Save the changes with `CTRL + X`, then `y` and finally `enter`

13. Run the mtproxybot project
```bash
npm start
```

## Bot commands

1. /start - start the bot
2. /reset - Reset bot status ( not proxy )

## Screenshots
![Image can't load](https://github.com/mmdzov/mtproxybot/blob/main/screenshot.png)
