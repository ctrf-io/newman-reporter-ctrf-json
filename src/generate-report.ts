import * as fs from 'fs'
import { type EventEmitter } from 'events'
import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
  type CtrfTestState,
} from '../types/ctrf'
import { type NewmanRunOptions, type NewmanRunSummary } from 'newman'
import path = require('path')

interface ReporterConfigOptions {
  outputFile?: string
  outputDir?: string
  minimal?: boolean
  testType?: string
  appName?: string
  appVersion?: string
  osPlatform?: string
  osRelease?: string
  osVersion?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  repositoryName?: string
  repositoryUrl?: string
  branchName?: string
  testEnvironment?: string

  // CLI-prefixed options
  ctrfJsonOutputFile?: string
  ctrfJsonOutputDir?: string
  ctrfJsonMinimal?: boolean
  ctrfJsonTestType?: string
  ctrfJsonAppName?: string
  ctrfJsonAppVersion?: string
  ctrfJsonOsPlatform?: string
  ctrfJsonOsRelease?: string
  ctrfJsonOsVersion?: string
  ctrfJsonBuildName?: string
  ctrfJsonBuildNumber?: string
  ctrfJsonBuildUrl?: string
  ctrfJsonRepositoryName?: string
  ctrfJsonRepositoryUrl?: string
  ctrfJsonBranchName?: string
  ctrfJsonTestEnvironment?: string
}

class GenerateCtrfReport {
  readonly ctrfReport: CtrfReport
  readonly ctrfEnvironment: CtrfEnvironment
  readonly reporterConfigOptions: ReporterConfigOptions
  readonly reporterName = 'newman-reporter-ctrf-json'
  readonly defaultOutputFile = 'ctrf-report.json'
  readonly defaultOutputDir = 'ctrf'
  filename = this.defaultOutputFile

  constructor(
    private readonly emitter: EventEmitter,
    reporterOptions: ReporterConfigOptions,
    private readonly collectionRunOptions: NewmanRunOptions
  ) {
    this.registerEvents()
    const normalizedOptions = this.normalizeOptions(reporterOptions)

    this.reporterConfigOptions = {
      outputFile: normalizedOptions.outputFile ?? this.defaultOutputFile,
      outputDir: normalizedOptions.outputDir ?? this.defaultOutputDir,
      minimal: this.parseBoolean(normalizedOptions.minimal ?? 'false'),
      testType: normalizedOptions.testType,
      appName: normalizedOptions.appName,
      appVersion: normalizedOptions.appVersion,
      osPlatform: normalizedOptions.osPlatform,
      osRelease: normalizedOptions.osRelease,
      osVersion: normalizedOptions.osVersion,
      buildName: normalizedOptions.buildName,
      buildNumber: normalizedOptions.buildNumber,
      buildUrl: normalizedOptions.buildUrl,
      repositoryName: normalizedOptions.repositoryName,
      repositoryUrl: normalizedOptions.repositoryUrl,
      branchName: normalizedOptions.branchName,
      testEnvironment: normalizedOptions.testEnvironment,
    }

    this.ctrfReport = {
      results: {
        tool: {
          name: 'newman',
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          skipped: 0,
          other: 0,
          start: 0,
          stop: 0,
        },
        tests: [],
      },
    }

    this.ctrfEnvironment = {}

    if (this.reporterConfigOptions?.outputFile !== undefined)
      this.setFilename(this.reporterConfigOptions.outputFile)

    if (
      !fs.existsSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir
      )
    ) {
      fs.mkdirSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
        { recursive: true }
      )
    }
  }

  private registerEvents(): void {
    this.emitter.on('start', () => {
      this.ctrfReport.results.summary.start = Date.now()
      this.setEnvironmentDetails(this.reporterConfigOptions ?? {})
      if (this.hasEnvironmentDetails(this.ctrfEnvironment)) {
        this.ctrfReport.results.environment = this.ctrfEnvironment
      }
    })

    this.emitter.on('done', (err, summary: NewmanRunSummary) => {
      if (err !== null || typeof summary === 'undefined') {
        return
      }

      const collectionName = summary.collection.name

      if (
        this.reporterConfigOptions?.outputFile !== undefined &&
        this.reporterConfigOptions.outputFile !== ''
      ) {
        this.setFilename(this.reporterConfigOptions.outputFile)
      }
      summary.run.executions.forEach((execution) => {
        if (execution.assertions) {
          const parentNames: string[] = []

          execution.item.forEachParent((parent) => {
            parentNames.unshift(parent.name)
          })

          const suiteName = [collectionName, ...parentNames].join(' > ')

          execution.assertions.forEach((assertion) => {
            this.ctrfReport.results.summary.tests += 1

            const testResult: CtrfTest = {
              name: `${execution.item.name}: ${assertion.assertion}`,
              status:
                assertion.error != null
                  ? ('failed' as CtrfTestState)
                  : assertion.skipped
                    ? ('skipped' as CtrfTestState)
                    : ('passed' as CtrfTestState),
              duration: execution.response?.responseTime ?? 0,
            }

            if (this.reporterConfigOptions.minimal === false) {
              testResult.suite = suiteName
              testResult.type = this.reporterConfigOptions.testType
            }

            if (assertion.error != null) {
              testResult.message = assertion.error.message
              testResult.trace = assertion.error.stack
              this.ctrfReport.results.summary.failed += 1
            } else if (assertion.skipped) {
              this.ctrfReport.results.summary.skipped += 1
            } else {
              this.ctrfReport.results.summary.passed += 1
            }

            this.ctrfReport.results.tests.push(testResult)
          })
        }
      })
      this.ctrfReport.results.summary.stop = Date.now()
      this.writeReportToFile(this.ctrfReport)
    })
  }

  private normalizeOptions(
    options: ReporterConfigOptions
  ): ReporterConfigOptions {
    const normalized: ReporterConfigOptions = {}

    normalized.outputFile = options.outputFile ?? options.ctrfJsonOutputFile
    normalized.outputDir = options.outputDir ?? options.ctrfJsonOutputDir
    normalized.minimal = options.minimal ?? options.ctrfJsonMinimal
    normalized.testType = options.testType ?? options.ctrfJsonTestType
    normalized.appName = options.appName ?? options.ctrfJsonAppName
    normalized.appVersion = options.appVersion ?? options.ctrfJsonAppVersion
    normalized.osPlatform = options.osPlatform ?? options.ctrfJsonOsPlatform
    normalized.osRelease = options.osRelease ?? options.ctrfJsonOsRelease
    normalized.osVersion = options.osVersion ?? options.ctrfJsonOsVersion
    normalized.buildName = options.buildName ?? options.ctrfJsonBuildName
    normalized.buildNumber = options.buildNumber ?? options.ctrfJsonBuildNumber
    normalized.buildUrl = options.buildUrl ?? options.ctrfJsonBuildUrl
    normalized.repositoryName =
      options.repositoryName ?? options.ctrfJsonRepositoryName
    normalized.repositoryUrl =
      options.repositoryUrl ?? options.ctrfJsonRepositoryUrl
    normalized.branchName = options.branchName ?? options.ctrfJsonBranchName
    normalized.testEnvironment =
      options.testEnvironment ?? options.ctrfJsonTestEnvironment

    return normalized
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  setEnvironmentDetails(reporterConfigOptions: ReporterConfigOptions): void {
    if (reporterConfigOptions.appName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.appName
    }
    if (reporterConfigOptions.appVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.appVersion
    }
    if (reporterConfigOptions.osPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.osPlatform
    }
    if (reporterConfigOptions.osRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.osRelease
    }
    if (reporterConfigOptions.osVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.osVersion
    }
    if (reporterConfigOptions.buildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.buildName
    }
    if (reporterConfigOptions.buildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber = reporterConfigOptions.buildNumber
    }
    if (reporterConfigOptions.buildUrl !== undefined) {
      this.ctrfEnvironment.buildUrl = reporterConfigOptions.buildUrl
    }
    if (reporterConfigOptions.repositoryName !== undefined) {
      this.ctrfEnvironment.repositoryName = reporterConfigOptions.repositoryName
    }
    if (reporterConfigOptions.repositoryUrl !== undefined) {
      this.ctrfEnvironment.repositoryUrl = reporterConfigOptions.repositoryUrl
    }
    if (reporterConfigOptions.branchName !== undefined) {
      this.ctrfEnvironment.branchName = reporterConfigOptions.branchName
    }
    if (reporterConfigOptions.testEnvironment !== undefined) {
      this.ctrfEnvironment.testEnvironment =
        reporterConfigOptions.testEnvironment
    }
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  private writeReportToFile(data: CtrfReport): void {
    const filePath = path.join(
      this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
      this.filename
    )
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s/%s`,
        this.reporterConfigOptions.outputDir,
        this.filename
      )
    } catch (error) {
      console.error(`Error writing ctrf json report:, ${String(error)}`)
    }
  }

  private parseBoolean(value: string | boolean): boolean {
    if (typeof value === 'boolean') return value
    return value.toLowerCase() === 'true'
  }
}

export = GenerateCtrfReport
