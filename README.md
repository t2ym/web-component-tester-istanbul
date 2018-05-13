# wct-istanbul

A fork of [web-component-tester-istanbul](https://github.com/thedeeno/web-component-tester-istanbul) Istanbul coverage plugin for [web-component-tester@^6.6.0](https://www.npmjs.com/package/web-component-tester).

Use this plugin to collect and report test coverage (via istanbul) for
your project on each test run.

## Supported syntax

| Syntax          | Status |
|:---------------:|:------:|
| ES2015+         | ✅     |
| ES Modules      | ✅     |
| object rest/spread properties | ✅     |
| async/await     | ✅     |
| import.meta     | ✅     |
| async iterator  | ✅     |

### Notes
- [babel-plugin-istanbul](https://www.npmjs.com/package/babel-plugin-istanbul) and [IstanbulJS](https://github.com/istanbuljs/istanbuljs) libraries compatible with [nyc v11.0.3](https://github.com/istanbuljs/nyc) are used since wct-istanbul 0.14.0.
- Only global coverage thresholds are effective since wct-istanbul 0.12.0.

## Installation

```sh
npm install --save-dev wct-istanbul
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
