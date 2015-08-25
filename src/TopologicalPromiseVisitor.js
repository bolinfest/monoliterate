/* @flow */
import ExecutorPool from './ExecutorPool';
import invariant from 'assert';

import type {PackageManager, PackageInfo} from './PackageManager';

/**
 * @param packageManager whose dependencies will be iterated in topological order.
 * @param f Function that receives a PackageInfo for processing. If the processing cannot be
 *   completed synchronously, then f() should return a Promise that is not fulfilled until the
 *   processing is complete.
 * @param poolSize The maximum number of calls to f() that should be run in parallel. Defaults to
 *   the number of CPUs.
 */
function visit(
    packageManager: PackageManager,
    f: (pkgInfo: PackageInfo) => mixed,
    poolSize: number = require('os').cpus().length): Promise<void> {
  var packageNameToDependenciesPromise: Map<string, Promise<void>> = new Map();
  var pool = new ExecutorPool(poolSize);
  for (let packageInfo of packageManager.packages()) {
    var dependencies = new Array(packageInfo.dependencies.size);
    var index = 0;
    for (var dependency of packageInfo.dependencies) {
      dependencies[index++] = packageNameToDependenciesPromise.get(dependency);
    }
    var dependenciesPromise = Promise.all(dependencies).then(_ => {
      return pool.submit((resolve, reject) => {
        // Note that result could be a thenable/promise.
        var result: any = f(packageInfo);
        resolve(result);
      });
    });
    packageNameToDependenciesPromise.set(packageInfo.name, dependenciesPromise);
  }
  return Promise.all(packageNameToDependenciesPromise.values());
}

module.exports = {
  visit,
};
