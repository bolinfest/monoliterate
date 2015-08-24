/* @flow */
var {createPackageManager} = require('../src/PackageManager');

async function printNames(directory: string): Promise<void> {
  var packageManager = await createPackageManager([
    directory,
  ]);
  packageManager.forEach(function(packageInfo) {
    console.log(packageInfo.name);
  });
}

module.exports = {
  printNames,
};
