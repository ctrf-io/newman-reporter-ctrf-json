# Newman Postman JSON test results report

> Save Newman Postman test results as a JSON file

A Postman newman JSON test reporter to create test reports that follow the CTRF standard.

[Common Test Report Format](https://ctrf.io) ensures the generation of uniform JSON test reports, independent of programming languages or test framework in use.

<div align="center">
<div style="padding: 1.5rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #30363d;">
<span style="font-size: 23px;">💚</span>
<h3 style="margin: 1rem 0;">CTRF tooling is open source and free to use</h3>
<p style="font-size: 16px;">You can support the project with a follow and a star</p>

<div style="margin-top: 1.5rem;">
<a href="https://github.com/ctrf-io/newman-reporter-ctrf-json">
<img src="https://img.shields.io/github/stars/ctrf-io/newman-reporter-ctrf-json?style=for-the-badge&color=2ea043" alt="GitHub stars">
</a>
<a href="https://github.com/ctrf-io">
<img src="https://img.shields.io/github/followers/ctrf-io?style=for-the-badge&color=2ea043" alt="GitHub followers">
</a>
</div>
</div>

<p style="font-size: 14px; margin: 1rem 0;">
Maintained by <a href="https://github.com/ma11hewthomas">Matthew Thomas</a><br/>
Contributions are very welcome! <br/>
Explore more <a href="https://www.ctrf.io/integrations">integrations</a>
</p>
</div>

## Features

- Generate JSON test reports that are [CTRF](https://ctrf.io) compliant
- Straightforward integration with newman

```json
{
  "results": {
    "tool": {
      "name": "newman"
    },
    "summary": {
      "tests": 1,
      "passed": 1,
      "failed": 0,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "ctrf should generate the same report with any tool",
        "status": "passed",
        "duration": 100
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyBuild",
      "buildNumber": "1"
    }
  }
}
```

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## Installation

```bash
npm install newman-reporter-ctrf-json
```

Run your tests with the reporter argument via the cli:

```bash
newman run ./postman_collection.json -r cli,ctrf-json
```

or programmatically:

```js
const newman = require('newman') // require newman in your project

// call newman.run to pass `options` object and wait for callback
newman.run(
  {
    collection: require('./sample-collection.json'),
    reporters: ['cli', 'ctrf-json'],
  },
  function (err) {
    if (err) {
      throw err
    }
    console.log('collection run complete!')
  }
)
```

You'll find a JSON file named `ctrf-report.json` in the `ctrf` directory.

## Reporter Options

The reporter supports several configuration options, you can pass these via the command line:

```bash
newman run ./postman_collection.json -r cli,ctrf-json \
--reporter-ctrf-json-output-file custom-name.json \
--reporter-ctrf-json-output-dir custom-directory \
--reporter-ctrf-json-test-type api \
--reporter-ctrf-json-minimal false \
--reporter-ctrf-json-app-name MyApp \
--reporter-ctrf-json-app-version 1.0.0 \
--reporter-ctrf-json-os-platform linux \
--reporter-ctrf-json-os-release 18.04 \
--reporter-ctrf-json-os-version 5.4.0 \
--reporter-ctrf-json-build-name MyApp \
--reporter-ctrf-json-build-number 100 \
--reporter-ctrf-json-build-url https://ctrf.io \
--reporter-ctrf-json-repository-name ctrf \
--reporter-ctrf-json-repository-url https://github.com/ctrf-io/newman-reporter-ctrf-json \
--reporter-ctrf-json-branch-name main \
--reporter-ctrf-json-test-environment staging
```

or programmatically:

```js
const newman = require('newman') // require newman in your project

// call newman.run to pass `options` object and wait for callback
newman.run(
  {
    collection: require('./sample-collection.json'),
    reporters: ['cli', 'ctrf-json'],
    reporter: {
      'ctrf-json': {
        outputFile: 'api_report_ctrf.json',
        outputDir: 'api_reports',
        minimal: true,
        testType: 'api',
        appName: 'MyApp',
        appVersion: '1.0.0',
        osPlatform: 'linux',
        osRelease: '18.04',
        osVersion: '5.4.0',
        buildName: 'MyApp',
        buildNumber: '100',
        buildUrl: 'https://ctrf.io',
        repositoryName: 'ctrf',
        repositoryUrl: 'https://github.com/ctrf-io/newman-reporter-ctrf-json',
        branchName: 'main',
        testEnvironment: 'staging',
      },
    },
  },
  function (err) {
    if (err) {
      throw err
    }
    console.log('collection run complete!')
  }
)
```

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name       | Type   | Required | Details                                                                             |
| ---------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `name`     | String | Required | The name of the test.                                                               |
| `status`   | String | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration` | Number | Required | The time taken for the test execution, in milliseconds.                             |
| `message`  | String | Optional | The failure message if the test failed.                                             |
| `trace`    | String | Optional | The stack trace captured if the test failed.                                        |
| `suite`    | String | Optional | The suite or group to which the test belongs.                                       |
| `type`     | String | Optional | The type of test (e.g., `api`, `contract`).                                         |

## Support Us

If you find this project useful, consider giving it a GitHub star ⭐ It means a lot to us.
