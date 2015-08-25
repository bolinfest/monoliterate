/* @flow */
var {createPackageManager} = require('./PackageManager');

async function printNames(directory: string): Promise<void> {
  var packageManager = await createPackageManager([
    directory,
  ]);
  for (var packageInfo of packageManager.packages()) {
    console.log(packageInfo.name);
  }
}

module.exports = {
  printNames,
};
