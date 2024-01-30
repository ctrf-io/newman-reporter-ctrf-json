# Postman Newman JSON Reporter - CTRF

A Postman newman test reporter to generate JSON test reports that are [CTRF](https://ctrf.io) compliant.

[Common Test Report Format](https://ctrf.io) helps you generate JSON reports that are agnostic of specific programming languages or test frameworks.

## Features

- Generate JSON test reports that are [CTRF](https://ctrf.io) compliant
- Straightforward integration with newman

## What is CTRF?

A JSON test report schema that is the same structure, no matter which testing tool is used. It's created to provide consistent test reporting agnostic of specific programming languages or testing frameworks. Where many testing frameworks exist, each generating JSON reports in their own way, CTRF provides a standardised schema helping you generate the same report anywhere.

## Installation

```bash
npm install --save-dev newman-reporter-ctrf-json
```

Run your tests with the reporter argument:

```bash
newman run ./postman_collection.json -r newman-reporter-ctrf-json
```

You'll find a JSON file named `ctrf-report.json` in the root directory.

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name       | Type   | Required | Details                                                                             |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `name`     | String | Required | The name of the test.                                                               |
| `status`   | String | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration` | Number | Required | The time taken for the test execution, in milliseconds.                             |
