# TL;DR: Automated Summaries

Like being in the know but not spending all that time reading to be in the know? TL;DR: Automated Summaries can help!

TL;DR takes all of the important stuff out of those drawn out novels you're trying to read. Simply feed it the content and how much you want to know, and it'll spit out all you need to know. Ya know?

If knowledge is power, and time is valuable, then TL;DR is powerfully valuable.

## Tech

Using NaturalNode's [natural](https://github.com/NaturalNode/natural) and [sylvester](https://github.com/NaturalNode/node-sylvester).
Improving with [gramma](https://caderek.github.io/gramma/) and [LanguageTool](https://languagetool.org).
Running on [Express](https://expressjs.com/) with [ejs](https://ejs.co/).

## Setup

Run [Language Tool on 8081](https://dev.languagetool.org/http-server.html).

```bash
git clone https://github.com/TwiRp/tldr.git
cd tldr
npm install
npm start
```

Head to http://localhost:3000 and start saving time.

[PM2](https://pm2.keymetrics.io) can be used to run and monitor both TL;DR and Language Tool.

## More

Server powered by [Linode](https://www.linode.com/). Built for [Hashnode](https://hashnode.com/)'s [Hackathon](https://townhall.hashnode.com/build-with-linode-hackathon-june-2022?source=hashnode_countdown).
