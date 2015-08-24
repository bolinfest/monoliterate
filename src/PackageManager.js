/* @flow */
var invariant = require('assert');
var Dequeue = require('dequeue');
var {fsPromise: fs} = require('nuclide-commons');
var path = require('path');

var DEPENDENCY_KEYS = [
  // Apparently both spellings are acceptable:
  'bundleDependencies',
  'bundledDependencies',

  'dependencies',
  'devDependencies',
];

type PackageInfo = {
  /** Name of the package. */
  name: string;

  /** Path to the package.json. */
  path: string;

  /** Dependencies. */
  dependencies: Set<string>;

  /** The parsed package.json. */
  json: Object;
};

type PackageMap = {[packageName: string]: PackageInfo};

class PackageManager {
  _packages: PackageMap;
  _sortedPackages: Array<PackageInfo>;

  constructor(packages: PackageMap) {
    // TODO: Combine these into a Map since it preserves insertion order.
    this._packages = packages;
    this._sortedPackages = new PackageSorter(packages).getSortedPackages();
  }

  /** Applies f to the packages in topologically sorted order. */
  forEach(f: (packageInfo: PackageInfo) => mixed): void {
    for (var packageInfo of this._sortedPackages) {
      f(packageInfo);
    }
  }

  getInfoForPackage(packageName: string): ?PackageInfo {
    return this._packages[packageName];
  }
}

class PackageSorter {
  _packages: PackageMap;
  _inProgress: Set<string>;
  _visited: Set<string>;
  _sortedPackages: Array<PackageInfo>;

  constructor(packages: PackageMap) {
    this._packages = packages;
    this._inProgress = new Set();
    this._visited = new Set();
    this._sortedPackages = [];
    for (var packageName in packages) {
      this._depthFirstSearch(packageName);
    }
  }

  getSortedPackages(): Array<PackageInfo> {
    return this._sortedPackages;
  }

  _depthFirstSearch(packageName: string): ?{packageNameCausingCycle: string, errorMessage: string} {
    if (this._visited.has(packageName)) {
      return;
    }
    if (this._inProgress.has(packageName)) {
      return {
        packageNameCausingCycle: packageName,
        errorMessage: `Recursive package dependencies: ${packageName}`,
      };
    }

    this._inProgress.add(packageName);
    var packageInfo = this._packages[packageName];
    for (var dependency of packageInfo.dependencies) {
      if (!(dependency in this._packages)) {
        continue;
      }

      var error = this._depthFirstSearch(dependency);
      if (error != null) {
        var {packageNameCausingCycle, errorMessage} = error;
        if (packageNameCausingCycle === packageName) {
          throw new Error(errorMessage);
        } else {
          return {
            packageNameCausingCycle,
            errorMessage: `${errorMessage}, ${packageName}`,
          };
        }
      }
    }

    this._inProgress.delete(packageName);
    this._sortedPackages.push(packageInfo);
    this._visited.add(packageName);
  }
}

async function findPackages(
  directories: Array<string>,
  options: Object,
): Promise<PackageMap> {
  var queue = new Dequeue();
  for (var directory of directories) {
    if (!(await fs.exists(directory))) {
      console.error(`Directory "${directory}" does not exist.`);
      continue;
    }

    var stats = await fs.stat(directory);
    if (stats.isDirectory()) {
      queue.push(path.normalize(directory));
    } else {
      console.error(`${directory} is not a directory.`);
    }
  }

  var packages = {};
  while (queue.length !== 0) {
    var directory = queue.shift();
    var packageJson = path.join(directory, 'package.json');

    if (await fs.exists(packageJson)) {
      var stats = await fs.stat(packageJson);
      invariant(stats.isFile());

      var json = JSON.parse(await fs.readFile(packageJson, {'encoding': 'utf-8'}));

      // Find all dependencies.
      var dependencies = new Set();
      for (var key of DEPENDENCY_KEYS) {
        for (var dependency in (json[key] || {})) {
          dependencies.add(dependency);
        }
      }

      var name = json['name'];
      packages[name] = {
        name,
        path: packageJson,
        dependencies,
        json: Object.freeze(json),
      };
    } else {
      var entries = await fs.readdir(directory);
      await* entries.map(async (entry) => {
        var fullPath = path.join(directory, entry);
        var stat = await fs.stat(fullPath);
        if (stat.isDirectory() && entry !== 'node_modules') {
          queue.unshift(fullPath);
        }
      });
    }
  }

  return packages;
}

async function createPackageManager(directories: Array<string>): Promise<PackageManager> {
  var packages = await findPackages(directories, {});
  return new PackageManager(packages);
}

module.exports = {
  createPackageManager,
};
