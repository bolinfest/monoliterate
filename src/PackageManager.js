/* @flow */
var invariant = require('assert');
var Dequeue = require('dequeue');
var {fsPromise: fs} = require('nuclide-commons');
var path = require('path');

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

class PackageManager {
  _packages: {[packageName: string]: PackageInfo};

  constructor(packages: {[packageName: string]: PackageInfo}) {
    this._packages = packages;
    // Do topological sort.
  }

  /** Applies f to the packages in topologically sorted order. */
  forEach(f: (packageInfo: PackageInfo) => mixed): void {
    for (var key in this._packages) {
      var packageInfo = this._packages[key];
      f(packageInfo);
    }
  }

  getInfoForPackage(packageName: string): ?PackageInfo {
    return this._packages[packageName];
  }
}

async function findPackages(
  directories: Array<string>,
  options: Object,
): Promise<{[packageName: string]: PackageInfo}> {
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
      var packageInfo = {
        name: json['name'],
        path: packageJson,
        dependencies: new Set(),
        json: Object.freeze(json),
      };
      packages[packageInfo.name] = packageInfo;
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
