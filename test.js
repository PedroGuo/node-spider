const path = require("path");
const fs = require("fs");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const { EventEmitter } = require("events");

class KeywordSpider extends EventEmitter {



  constructor(keywords = []) {
    super();
    this.keywords = keywords;
    this.init();
    this.listenEvents();
  }

  init() {
    this.rules = [
        {
          engine: "baidu",
          searchUrl: "https://www.baidu.com/s?rsv_spt=1&rsv_iqid=0x8c1738e500000f68&issp=1&f=8&rsv_bp=1&rsv_idx=2&ie=utf-8&tn=baiduhome_pg&rsv_enter=1&rsv_dl=tb&rsv_sug3=18&rsv_sug1=17&rsv_sug7=101&rsv_sug2=0&rsv_btype=i&prefixsug=react.js&rsp=5&inputT=5307&rsv_sug4=6364&wd=",
          selector: ".new-inc-rs-table a",
          enable: true,
        },
        {
          engine: "360",
          searchUrl:
            "https://www.so.com/s?ie=utf-8&fr=none&src=360sou_newhome&nlpv=global_b_shbt&q=",
          selector: ".rs-table a",
          enable: true,
        },
        {
          engine: "sogou",
          searchUrl: "https://www.sogou.com/web?query=",
          selector: ".hint a",
          enable: true,
        },
        {
          engine: "google",
          searchUrl: "https://www.google.com/search?oe=utf-8&q=",
          selector: ".Sljvkf div.BNeawe",
          enable: true,
        },
      ];
    
    this.kwList = [];
}
  listenEvents() {
    this.on("next", this.handleNext);
    this.on("error", this.handleError);
  }

  start() {
    if (Array.isArray(this.keywords) && this.keywords.length > 0) {
      let firstKeyWord = this.keywords.pop();
      this.beginWork(firstKeyWord);
    }
  }

  beginWork(keyword) {
    let tasks = this.prepareTasks(keyword);
    this.performTasks(tasks);
  }

  prepareTasks(keyword) {
    return this.rules.map((rule) => {
      return {
        ...rule,
        keyword,
        searchUrl: rule.searchUrl + encodeURI(keyword),
      };
    });
  }

  performTasks(tasks) {
    Promise.all(tasks.map((task) => this.getKeywords(task)))
      .then((result) => {
        console.dir(result);
        this.kwList.push(result);
        this.emit("next", result);
      })
      .catch((error) => {
        this.emit("error", error);
      });
  }

  getKeywords(task) {
    console.log("开始请求：" + task.searchUrl);
    return fetch(task.searchUrl, {
      headers: {
        // "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36`,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,id;q=0.7",
        "content-type": "text/plain;charset=UTF-8",
      },
    })
      .then((res) => res.text())
      .then((body) => {
        const $ = cheerio.load(body);
        let keywords = [];
        $(task.selector).each((index, element) => {
          keywords.push($(element).text());
        });
        console.log("获取数据：" + task.engine);
        return {
          engine: task.engine,
          keyword: task.keyword,
          keywords,
        };
      })
      .catch((err) => this.emit(err));
  }

  handleNext() {
    if (this.keywords.length > 0) {
      this.beginWork(this.keywords.pop());
    } else {
      fs.writeFileSync(path.join(__dirname, './juejin-keywords.json'), JSON.stringify(this.kwList));
      console.dir(JSON.stringify(this.kwList));
    }
  }

  handleError(error) {
    console.dir(error);
  }
}

let kwSpider = new KeywordSpider([
  "JavaScript",
  "前端",
  "Vue.js",
  "React.js",
  "Node.js",
  "CSS",
  "Webpack",
  "微信小程序",
  "面试",
  "TypeScript",
  "Flutter",
  "浏览器",
  "Github",
  "Promise",
  "前端架构",
]);

kwSpider.start();
