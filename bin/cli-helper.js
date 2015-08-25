/* @flow */

function createYargs(): void {
  var yargs = require('yargs')
    .usage('Usage $0 <command> [options]')
    .command(
      'names',
      'List the names of the packages')
    .command(
      'manifests',
      'List the paths to the package.json files')
    .command(
      'setup',
      'Symlink local packages and `npm install` the rest')
    .help('help')
    .alias('h', 'help');

  var {argv} = yargs;
  var command = argv._[0];

  if (command === 'names') {
    var {argv} = yargs
      .resetOptions()
      .option('directory', {
        alias: 'd',
        description: 'Where to look for packages',
      })
      .help('help')
      .alias('h', 'help');
    var {printNames} = require('../src/names');
    printNames(argv.directory);
  } else if (command === 'manifests') {
    var {argv} = yargs
      .resetOptions()
      .option('directory', {
        alias: 'd',
        description: 'Where to look for packages',
      })
      .help('help')
      .alias('h', 'help');
    var {printManifestPaths} = require('../src/manifests');
    printManifestPaths(argv.directory);
  } else if (command === 'setup') {
    var {argv} = yargs
      .resetOptions()
      .option('directory', {
        alias: 'd',
        description: 'Where to look for packages',
      })
      .help('help')
      .alias('h', 'help');
    var {install} = require('../src/setup');
    install(argv.directory);
  } else {
    yargs.showHelp();
  }
}

createYargs();
