# monoliterate

Scripts to facilitate developing multiple Node packages in a single, monolithic repository.

## Usage

This takes a directory of Node packages and does a depth-first traversal to discover them by looking
for `package.json` files without following `node_modules` directories.
These are assumed to be an interrelated set of packages that are being developed together.
These packages can reference each other by name in their `"dependencies"` and `"devDependencies"`
(rather than by local file path).

Note that monoliterate **does not tolerate cycles** in the dependency graph formed by the packages
you are developing locally. However, it does not care about cycles in your transitive dependencies.
Denying cyclical dependencies makes it possible to topologically sort your local dependencies, which
makes it easier to exploit parallelism when processing your local packages.

The primary purpose of monoliterate is to set up your network of local packages for development. Do
this by running:

```
node ./bin/cli.js setup --directory <your-directory-of-packages>
```

For each local package, its local dependencies will be referenced via a symlink under its
`node_modules` directory. All other dependencies will be installed normally via `npm install`.
Due to the graph of symlinks you have created, you can develop all of your local packages in place.
You do not need to run `setup` again until your dependency graph changes.

You can list all of the names of your local packages in topologically sorted order:

```
node ./bin/cli.js names --directory <your-directory-of-packages>
```

Or all of their `package.json` files:

```
node ./bin/cli.js manifests --directory <your-directory-of-packages>
```

This can be useful for ad-hoc scripts, such as running `npm test` for each package:

```
node ./bin/cli.js manifests --directory <your-directory-of-packages> \
  | xargs -I {} dirname {} \
  | xargs -I {} npm --prefix {} test
```

## System Requirements

Requires io.js or Node 0.12 or later running with the `-harmony` flag.

## Inspiration

This was inspired by the [set of scripts used to manage the Nuclide repo](
https://github.com/facebook/nuclide/tree/master/scripts/dev). The Nuclide scripts were written
in Python so they could be run in a diverse set of environments, such as ones running old
versions of Python and Node (ahem, CentOS).
