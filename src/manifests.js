/* @flow */
var {createPackageManager} = require('./PackageManager');

async function printManifestPaths(directory: string): Promise<void> {
  var packageManager = await createPackageManager([
    directory,
  ]);
  packageManager.forEach(function(packageInfo) {
    console.log(packageInfo.path);
  });
}

module.exports = {
  printManifestPaths,
};
