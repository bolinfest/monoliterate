/* @flow */
import {createPackageManager} from './PackageManager';
import {visit} from './TopologicalPromiseVisitor';
import {spawn} from 'child_process';
import {fsPromise as fs} from 'nuclide-commons';
import path from 'path';

import type {PackageManager, PackageInfo} from './PackageManager';

var IS_WINDOWS = require('os').platform().startsWith('win');

async function install(directory: string): Promise<void> {
  var packageManager = await createPackageManager([
    directory,
  ]);

  var doInstall = installPackage.bind(null, packageManager);
  await visit(packageManager, doInstall);
  process.stdout.write('\n');
}

async function installPackage(
  packageManager: PackageManager,
  pkgInfo: PackageInfo
): Promise<mixed> {
  var directory = path.dirname(pkgInfo.path);
  var nodeModules = path.join(directory, 'node_modules');
  await fs.mkdirp(nodeModules);

  for (var packageName of pkgInfo.dependencies) {
    var depPkgInfo = packageManager.getInfoForPackage(packageName);
    if (!depPkgInfo) {
      continue;
    }

    // Create a symlink to local dependency.
    var srcpath, destpath, type;
    if (IS_WINDOWS) {
      srcpath = path.dirname(depPkgInfo.path);
      destpath = path.join(nodeModules, packageName);
      type = 'junction';
    } else {
      // TODO: Use relative symlinks.
      srcpath = path.dirname(depPkgInfo.path);
      destpath = path.join(nodeModules, packageName);
      type = 'dir';
    }
    // fs.symlink() will fail if destpath already exists, so we categorically remove destpath before
    // calling fs.symlink() to be safe.
    await clearLink(destpath);
    await fs.symlink(srcpath, destpath, type);
    await linkExecutables(destpath);
  }

  // Now that there are symlinks in place for all of the local dependencies, use `npm install` to
  // install the remaining dependencies.
  await new Promise((resolve, reject) => {
    var npm = spawn('npm', ['install'], {cwd: directory});
    npm.on('close', resolve);
    npm.on('error', reject);
  });
  process.stdout.write('.');
}

/**
 * Local dependencies with a "bin" property in their package.json need the corresponding executables
 * to be symlinked as if `npm install` had installed the package.
 * @param destpath The name of the directory under node_modules that contains the package.json for
 *   the local dependency.
 */
async function linkExecutables(destpath: string): Promise<void> {
  var json = require(path.join(destpath, 'package.json'));

  var {bin} = json;
  // The bin field would ether be a dict or a string. if it's a dict,
  // such as `{ "name": "test", "bin" : { "myapp" : "./cli.js" } }`, we should create a
  // symlink from ./node_modules/test/cli.js to ./node_modules/.bin/myapp.
  // If it's a string, like `{ "name": "test", "bin" : "./cli.js"  }`, then the symlink's name
  // should be name of the package, in this case, it should be ./node_modules/.bin/test.
  var symlinksToCreate;
  if (!bin) {
    return;
  } else if (typeof bin === 'string') {
    symlinksToCreate = {};
    var packageName = path.basename(destpath);
    symlinksToCreate[packageName] = bin;
  } else {
    symlinksToCreate = bin;
  }

  var dotBinPath = path.join(path.dirname(destpath), '.bin');
  await fs.mkdirp(dotBinPath);

  for (var targetName in symlinksToCreate) {
    var relativePath = symlinksToCreate[targetName];
    var absoluteDest = path.join(dotBinPath, targetName);
    var absoluteSrc = path.join(destpath, relativePath);

    if (IS_WINDOWS) {
      // "Symlinking" a file on Windows requires admin privileges, so we copy it instead.
      var contents = await fs.readFile(absoluteSrc, {'encoding': 'utf-8'});
      await fs.writeFile(absoluteDest, contents);
    } else {
      await clearLink(absoluteDest);
      await fs.symlink(absoluteSrc, absoluteDest, 'file');
    }
  }
}

async function clearLink(pathToLink: string): Promise<void> {
  if (await fs.exists(pathToLink)) {
    await fs.unlink(pathToLink);
  }
}

// Use this to help verify that the async logic is working as expected.
async function doDummyInstall(packageManager: PackageManager): Promise<void> {
  var id = setInterval(() => console.log('===================='), 500);
  await visit(packageManager, function(pkgInfo) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log(`All dependencies for ${pkgInfo.name} are installed.`);
        resolve();
      }, 500);
    });
  });
  clearInterval(id);
}

module.exports = {
  install,
};
