import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import fetchApi from 'node-fetch';
import { TaskScheduler } from "./utils/index";

/**********下面为使用方式********* */

interface Rules {
    engine: string;
    searchUrl: string;
    selector: string;
    enable: boolean;
    keyword?: string;
}

interface Result {
    engine: string;
    keyword: string;
    keywords?: Array<string>;
}


const keyWords: Array<string> = [
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
];

const rulesUrl: Array<Rules> = [
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
    // {
    //   engine: "google",
    //   searchUrl: "https://www.google.com/search?oe=utf-8&q=",
    //   selector: ".Sljvkf div.BNeawe",
    //   enable: true,
    // },
];


function taskGenerator(keyWords: Array<string>, rulesUrl: Array<Rules>): Array<Rules> {
    const result: Array<Rules> = [];
    keyWords.forEach(keyword => {
        rulesUrl.forEach(rules => {
            const obj = {...rules};
            obj['searchUrl'] += encodeURI(keyword);
            obj['keyword'] = keyword;
            result.push(obj)
        })
    })
    return result
}
const tasks =  taskGenerator(keyWords, rulesUrl);

async function dispatchRequest(taskItem: Rules): Promise<string> {
    const res = await fetchApi(taskItem.searchUrl, {
        headers: {
            "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36`,
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,id;q=0.7",
            "content-type": "text/plain;charset=UTF-8",
        },
    });
    return await res.text();
}

const taskCenter = new TaskScheduler({
    tasks,
    action: dispatchRequest,
    limit: 3
})

const keyWordResult: Array<Result> = [];

// 启动任务
taskCenter.start();

taskCenter.on('taskResolve', (body: string, task: Rules) => {
    try{
        const $ = cheerio.load(body);
        let keywords: Array<string> = [];
        $(task.selector).each((index: number, element: any) => {
          keywords.push($(element).text());
        });
        keyWordResult.push({
            engine: task.engine,
            keyword: task.keyword!,
            keywords,
        })
    } catch( e) {
        console.log(e)
    }
})

taskCenter.on('taskComplete', () => {
    fs.writeFileSync(path.join(__dirname, './log/keywords.json'),JSON.stringify(keyWordResult))
})




