# Postman Newman JSON Reporter - CTRF

A Postman newman test reporter to generate JSON test reports that are [CTRF](https://ctrf.io) compliant.

[Common Test Report Format](https://ctrf.io) helps you generate JSON reports that are agnostic of specific programming languages or test frameworks.

## Features

- Generate JSON test reports that are [CTRF](https://ctrf.io) compliant
- Straightforward integration with newman

## What is CTRF?

A JSON test report schema that is the same structure, no matter which testing tool is used. It's created to provide consistent test reporting agnostic of specific programming languages or testing frameworks. Where many testing frameworks exist, each generating JSON reports in their own way, CTRF provides a standardised schema helping you generate the same report anywhere.

``` json
{
  "results": {
    "tool": {
      "name": "newman"
    },
    "summary": {
      "tests": 4,
      "passed": 3,
      "failed": 1,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "API Status code is 200",
        "status": "passed",
        "duration": 801
      },
      ...
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyApp",
      "buildNumber": "100"
    }
  }
}
```

## Installation

```bash
npm install newman-reporter-ctrf-json
```

Run your tests with the reporter argument:

```bash
newman run ./postman_collection.json -r ctrf-json
```

You'll find a JSON file named `ctrf-report.json` in the `ctrf` directory.

## Reporter Options

The reporter supports several configuration options passed via the command line:

```bash
newman run ./postman_collection.json -r ctrf-json \
--reporter-ctrf-json-output-file custom-name.json \
--reporter-ctrf-json-output-dir custom-directory \
--reporter-ctrf-json-app-name MyApp \
--reporter-ctrf-json-app-version 1.0.0 \
--reporter-ctrf-json-os-platform linux \
--reporter-ctrf-json-os-release 18.04 \
--reporter-ctrf-json-os-version 5.4.0 \
--reporter-ctrf-json-build-name MyApp \
--reporter-ctrf-json-build-number 100
```

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name       | Type   | Required | Details                                                                             |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `name`     | String | Required | The name of the test.                                                               |
| `status`   | String | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration` | Number | Required | The time taken for the test execution, in milliseconds.                             |
