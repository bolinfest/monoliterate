/* @flow */
var Dequeue = require('dequeue');
var {EventEmitter} = require('events');

/**
 * Pool that executes up to N Promise executors at a time, in the order they were submitted to the
 * pool.
 *
 * The executor function passed to the constructor of a Promise is evaluated immediately. This may
 * not always be desirable. Use an ExecutorPool if you want to put a cap on how many executor
 * functions are run simultaneously.
 */
class ExecutorPool {
  _poolSize: number;
  _fifo: Dequeue;
  _emitter: EventEmitter;
  _numRunning: number;
  _nextRequestId: number;

  constructor(poolSize: number) {
    this._poolSize = poolSize;
    this._fifo = new Dequeue();
    this._emitter = new EventEmitter();
    this._numRunning = 0;
    this._nextRequestId = 1;
  }

  isEmpty(): boolean {
    return this._fifo.length === 0;
  }

  /**
   * @param executor A function that takes resolve and reject callbacks, just like the Promise
   *   constructor.
   * @return A Promise that will be resolved/rejected in response to the execution of the executor.
   */
  submit<T>(executor: (resolve: (result: T | Promise<T>) => void,
                       reject: (error: mixed) => void) => mixed): Promise<T> {
    var id = this._getNextRequestId();
    this._fifo.push({id: id, executor: executor});
    var promise = new Promise((resolve, reject) => {
      this._emitter.once(id, (result) => {
        var {isSuccess, value} = result;
        (isSuccess ? resolve : reject)(value);
      });
    });
    this._run();
    return promise;
  }

  _run() {
    if (this._numRunning === this._poolSize) {
      return;
    }

    if (this._fifo.length === 0) {
      return;
    }

    var {id, executor} = this._fifo.shift();
    this._numRunning++;
    new Promise(executor).then(result => {
      this._emitter.emit(id, {isSuccess: true, value: result});
      this._numRunning--;
      this._run();
    }, (error) => {
      this._emitter.emit(id, {isSuccess: false, value: error});
      this._numRunning--;
      this._run();
    });
  }

  _getNextRequestId(): string {
    return (this._nextRequestId++).toString(16);
  }
}

module.exports = ExecutorPool;
