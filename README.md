# wct-istanbul

A fork of [web-component-tester-istanbul](https://github.com/thedeeno/web-component-tester-istanbul) Istanbul coverage plugin for [web-component-tester@^6.6.0](https://www.npmjs.com/package/web-component-tester) and [@t2ym/web-component-tester](https://github.com/t2ym/web-component-tester/tree/wct6-plugin-scoped).

## Compatibility Table

|                | web-component-tester@^6.6.0 | @t2ym/web-component-tester@^6.0.2 |
|:--------------:|:---------------------------:|:---------------------------------:|
| wct-istanbul   | ^0.14.0                     | ^0.14.0                           |
| polymer-cli    | ^1.7.0                      | @t2ym/polymer-cli@^1.3.2          |
| wct-browser-legacy | ✅ `(*1)`               | ✅ `(*1)`                        |
| browser.js     | ✅ `(*1)`                | t2ym/web-component-tester#^6.0.2 `(*1)` |
| local browsers | ✅                          | ✅                                |
| Sauce Labs     | Small coverage only `(*1)`    | ✅ `(*1)`                       |
| import.meta    | ✅                      | ✅                        |

### Notes on Compatibility Table
- `(*1)` - Sauce Labs Compatibility
  - Squid proxies in Sauce Labs do not pass large socket.io traffic data and thus drop large coverage data
  - `wct-istanbul` + `@t2ym/web-component-tester@^6.0.2` support chopping and combining of large coverage data to pass the Sauce Labs proxies
    - Make sure `browser.js` from `@t2ym/web-component-tester@^6.0.2` or bower `t2ym/web-component-tester#^6.0.2` is used

Use this plugin to collect and report test coverage (via istanbul) for
your project on each test run.

### Common Notes
- [babel-plugin-istanbul](https://www.npmjs.com/package/babel-plugin-istanbul) and [IstanbulJS](https://github.com/istanbuljs/istanbuljs) libraries compatible with [nyc v11.0.3](https://github.com/istanbuljs/nyc) are used since wct-istanbul 0.14.0.
- async/await support with [IstanbulJS](https://github.com/istanbuljs/istanbuljs) libraries
- Only global coverage thresholds are effective since wct-istanbul 0.12.0.

## Installation

```sh
npm install --save-dev wct-istanbul
```

### Notes on `@t2ym/web-component-tester`
- The module can be installed with [@t2ym/web-component-tester](https://github.com/t2ym/web-component-tester/tree/wct6-plugin-scoped)
```sh
npm install --save-dev @t2ym/web-component-tester
bower install --save-dev t2ym/web-component-tester
```
- The dedicated fork [@t2ym/polymer-cli](https://github.com/t2ym/polymer-cli/tree/wct6-plugin) can be used with the module
```sh
npm install -g @t2ym/polymer-cli
# for polymer test
npm install -g wct-istanbul
```

## Basic Usage

Add the following configuration to web-component-tester's config file.

## Example

```js
module.exports = {
  plugins: {
    istanbul: {
      dir: "./coverage",
      reporters: ["text-summary", "lcov"],
      include: [
        "**/*.js"
      ],
      exclude: [
        "/polymer/polymer.js",
        "/platform/platform.js"
      ]
    }
  }
}
```

## Options

Below are the available configuration options:

### dir

The directory to write coverage reports to.

### reporters

An array of istanbul reporters to use.

### include

Files to include in instrumentation.

### exclude

Files to exclude from instrumentation (this trumps files 'included' with
the option above).

## Coverage Thresholds

In addition to measuring coverage, this plugin can be used to enforce
coverage thresholds.  If coverage does not meet the configured thresholds,
then the test run will fail, even if all tests passed.

This requires specifying the `thresholds` option for the plugin

### Example

The following configuration will cause the test run to fail if less
than 100% of the statements in instrumented files are covered by
tests.

```js
module.exports = {
  plugins: {
    istanbul: {
      dir: "./coverage",
      reporters: ["text-summary", "lcov"],
      include: [
        "**/*.js"
      ],
      exclude: [
        "/polymer/polymer.js",
        "/platform/platform.js"
      ],
      thresholds: {
        global: {
          statements: 100
        }
      }
    }
  }
}
```
