// This file must be written in ES5 because it bootstraps Babel.

// Before we run anything, add the unhandled Promise rejection handler.
process.on('unhandledRejection', function(error, promise) {
  console.error('Unhandled promise rejection with error: ' + error);
});

// Make sure all .js files that are subsequently loaded are transpiled.
require('babel-core/register')({
  blacklist: [
    'useStrict',
  ],
  optional: [
    'asyncToGenerator',
  ],
  stage: 0,

  extensions: ['.js'],
});

// Now cli-helper and its transitive requires can be written in ES6.
require('./cli-helper.js');
