const fetch = require("node-fetch");
const EventEmitter = require('events').EventEmitter;
const cheerio = require("cheerio");
const fs = require('fs')


class Spider extends EventEmitter {

    constructor(options) {
        super();
        this.init(options);
    }

    init(options) {
        this.tasks = Array.from(new Set(options.tasks));
        this.errors = []; // 请求失败 大于 预设次数
        this.result = []; // 结果数据
        this.maxError = options.maxError || 5;
        this.limit = options.limit || 5;
        this.taskQueue = this.tasks.splice(0, this.limit);
        this.listenEvens()
        this.runTask();
    }

    checkParam(options) {
        const  URL = /(http|https):\/\/([\w.]+\/?)\S*/;
        if (!options.url) {
            console.error('没有传递需要爬取的接口地址')
            return false
        }
        if (URL.test(options.url)) {
            console.error('传递的链接有问题')
            return false
        }
        return true
    }


    urlGenerator({ id }) {
        return  `https://juejin.cn/user/${id}/posts`
    }

    listenEvens() {
        this.on('fetchSuccess', (data) => {
            if (!this.tasks.length) return 
            this.taskQueue.push(this.tasks.shift())
            this.runTask();
            
        })
        this.on('fetchFails', (taskItem) => {
            this.errors.push(taskItem)
        })
    }

    runTask() {
        this.taskQueue = this.taskQueue.map( item => {
            if (typeof item !== 'object') {
                return {id: item, count: 1}
            } else {
                return item
            }
        })
     
        while(this.taskQueue.length) {
            this.dispatchRequest(this.taskQueue.shift());
        }
    }

    dispatchRequest(taskItem) {
        const url = this.urlGenerator(taskItem)
        fetch(url)
        .then((res) => res.text())
        .then((body) =>  {
            this.emit('fetchSuccess', body, taskItem);
        })
        .catch((err) => {
            this.handleError(taskItem)
        })
    }

    handleError (taskItem) {
        taskItem.count++;
        if (taskItem.count < this.maxError)  {
            this.taskQueue.push(taskItem)
            this.runTask();
        } else {
            this.emit('fetchFails', taskItem.id );
        }
    }
}

let usrList = [764915822103079,2348212569517645,3808363978429613,3667626522862270,2330620350708823,2664871913078168,1626932938285976,923245497557111,'abcdesd','1asdsadsa1dsa1d1sad1==123/fdajfkld']
let Avatar = new Spider({
    tasks: usrList
});

Avatar.on('fetchSuccess', (html, item) => {
    let $ = cheerio.load(html);
    let avatar = $(".user-info-block .avatar")[0].attribs["data-src"];
    let name =
    fetch(avatar)
    .then((res) => res.buffer())
    .then((buffer) =>  {
        fs.writeFile(`../images/${item.id}.jpg`, buffer, (err) => {
            if (err) throw err;
            console.log('文件已被保存');
        })
    })
    // .then(type => console.log(type))
    console.dir(avatar);
})
Avatar.on('fetchFails', (item) => {
    let versionText = item + '\n';
    fs.appendFileSync('../images/错误日志.txt', versionText)
})


