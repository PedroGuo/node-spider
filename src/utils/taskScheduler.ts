import { EventEmitter } from './events';

type RunTask<T> = (...args: T[]) => Promise<any>

interface QueueContent<T> {
    task: T;
    $$count: number;
}

interface Options<T> {
    action: RunTask<T>;
    tasks: Array<T>;
    limit: number;
}

// 最大错误重试数
const MAX_ERROR_RETRIES = 5;

// 最大并发数
const MAX_LIMIT_COUNT = 5;


export class TaskScheduler<T> extends EventEmitter{

    taskList: Array<T> = [];
    private queue: Array<QueueContent<T>> = [];
    limit: number = 0;
    private processing: Array<QueueContent<T>> = [];
    private runTask: RunTask<T> = () => Promise.resolve();
    private taskTotal: number = 0;

    constructor(options: Options<T>) {
        super([
            'taskResolve',
            'taskComplete',
            'fetchFail',
            'taskFail',
            'destroy',
          ])
        this.init(options)
    }

    init(options: Options<T>) {
        this.listenEvents();
        this.resolveOptions(options);
    }

    resolveOptions(options: Options<T>) {
        this.runTask = options.action;
        this.taskList = [...options.tasks];
        this.taskTotal = this.taskList.length;
        this.limit = options.limit || MAX_LIMIT_COUNT;
    }

    listenEvents() {
        this.on(this.eventTypes.taskResolve, () => {
            this.taskTotal--
            this.checkTask();
        });
        this.on(this.eventTypes.fetchFail, (taskItem: QueueContent<T>) => {
            taskItem['$$count'] += 1
            if (taskItem['$$count'] < MAX_ERROR_RETRIES ) {
                this.enqueue(taskItem)
            } else {
                this.taskTotal--
                this.emit(this.eventTypes.taskFail, taskItem);
            }
        });
    }

    start() {
        // this.emit('taskBeforeStart')
        while (this.taskList.length) {
            this.enqueue({ task: this.taskList.shift()!, '$$count': 1});
        }
        // this.emit('taskStart')
    }

    enqueue(taskItem: QueueContent<T>) {
        this.queue.push(taskItem);
        this.checkTask();
    }

    run(item: QueueContent<T>) {
        this.queue = this.queue.filter(v => v !== item);
        this.processing.push(item);
        // this.emit('beforeRunTask', item.task)
        this.runTask(item.task).then((data) => {
            this.processing = this.processing.filter(v => v !== item);
            this.emit(this.eventTypes.taskResolve, data, item.task);
            if (this.taskTotal === 0) {
                this.emit(this.eventTypes.taskComplete)
            }
        }, err => this.emit(this.eventTypes.fetchFail, item, err));
    }

    checkTask() {
        const processingNum = this.processing.length;
        const availableNum = this.limit - processingNum;
        this.queue.slice(0, availableNum).forEach(item => {
            this.run(item);
        });
    }
}