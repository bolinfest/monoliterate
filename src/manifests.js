/* @flow */
var {createPackageManager} = require('./PackageManager');

async function printManifestPaths(directory: string): Promise<void> {
  var packageManager = await createPackageManager([
    directory,
  ]);
  for (var packageInfo of packageManager.packages()) {
    console.log(packageInfo.path);
  }
}

module.exports = {
  printManifestPaths,
};
