# monoliterate

Scripts to facilitate developing multiple Node packages in a single repository.

## Usage

Currently, this takes a directory of Node packages and does a depth-first traversal
to discover Node packages and topologically sort them (it does not tolerate cycles).
Currently, all it can do is print out the packages in sorted order, but more functionality
is on the way.

```
git clone https://github.com/facebook/nuclide.git
cd nuclide/pkg/nuclide
node ./bin/cli.js names --directory $PWD
node ./bin/cli.js manifests --directory $PWD
```

## System Requirements

Requires io.js or Node 0.12 or later running with the `-harmony` flag.

## Inspiration

This was inspired by the [set of scripts used to manage the Nuclide repo](
https://github.com/facebook/nuclide/tree/master/scripts/dev). The Nuclide scripts were written
in Python so they could be run in a diverse set of environments, such as ones running old
versions of Python and Node (ahem, CentOS).
