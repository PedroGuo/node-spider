const fetch = require("node-fetch");
const EventEmitter = require('events').EventEmitter;
const cheerio = require("cheerio");


class TaskScheduler extends EventEmitter{
    constructor(options) {
        super();
        this.init(options)
    }

    init(options) {
        this.listenEvents();
        this.resolveOptions(options);
    }

    resolveOptions(options) {
        this.queue = [];
        this.processing = [];
        this.runTask = (typeof options.action    === 'function') ? options.action  :  Promise.resolve();
        this.taskList = [...options.tasks];
        this.limit = options.limit || 5;
    }

    listenEvents() {
        this.on('taskResolve', () => {
            this.check();
        });
        this.on('fetchFail', (taskItem) => {
            taskItem['$$count'] += 1
            if (taskItem['$$count'] < 5 ) {
                this.enqueue(taskItem)
            } else {
                this.emit('taskFail', taskItem);
            }
        });
    }

    start() {
        while (this.taskList.length) {
            this.enqueue({ task: this.taskList.shift(), '$$count': 1});
        }
    }

    enqueue(task) {  
        this.queue.push(task);
        this.check();
    }

    run(item) {
        this.queue = this.queue.filter(v => v !== item);
        this.processing.push(item);
        this.runTask(item.task).then((data) => {
            this.processing = this.processing.filter(v => v !== item);
            this.emit('taskResolve', data)
        }, err => this.emit('fetchFail', item, err));
    }

    check() {
        const processingNum = this.processing.length;
        const availableNum = this.limit - processingNum;
        this.queue.slice(0, availableNum).forEach(item => {
            this.run(item);
        });
    }
}


const usrList = [764915822103079, 2348212569517645, 3808363978429613, 3667626522862270, 2330620350708823, 2664871913078168, 1626932938285976, 923245497557111, 'abcdesd', '1asdsadsa1dsa1d1sad1==123/fdajfkld'];

const errList = [];

const result = []

function urlGenerator(id) {
    return `https://juejin.cn/user/${id}/posts`;
}


function dispatchRequest(taskItem) {
    const url = urlGenerator(taskItem)
    return fetch(url).then((res) => res.text())
}


const dispatch = new TaskScheduler({
    tasks: usrList,
    handle: dispatchRequest,
    limit: 3
})

dispatch.on('taskResolve', (html) => {
    try{
        let $ = cheerio.load(html);
        let avatar = $(".user-info-block .avatar")['0'].attribs['alt'];
        console.dir(avatar)
        result.push(avatar)
    } catch( e) {
        console.log(e)
    }

})

dispatch.on('taskFails', (item) => {
    console.log('taskFails',item)
    errList.push(item)
})





