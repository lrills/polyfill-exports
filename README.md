# polyfill-exports

Create a script to polyfill requiring ES package \"exports\" for nodejs 12 below.

## Install

```shell
$ npm install -D polyfill-exports
# or
$ yarn add --dev polyfill-exports
```

## Usage

Build the polyfill script:

```shell
$ npx polyfill-exports
# or
$ yarn run polyfill-exports
```

then add the script into package.json "files" and "postinstall" hook.

```js
// your package.json
{
  ...,
  "exports": {
    "foo": "./lib/foo.js"
  },
  "script": {
    "postinstall": "./polyfill-exports"
  },
  "files": [
    ...,
    "polyfill-exports"
  ]
  ...
}
```

### Delete polyfill files

```shell
$ npx polyfill-exports --delete
# or
$ yarn run polyfill-exports --delete
```
