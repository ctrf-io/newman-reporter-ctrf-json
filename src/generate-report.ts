import * as fs from 'fs'
import { type EventEmitter } from 'events'
import {
  type CtrfEnvironment,
  type CtrfReport,
  type CtrfTestState,
} from '../types/ctrf'
import { type NewmanRunOptions, type NewmanRunSummary } from 'newman'
import path = require('path')

interface ReporterConfigOptions {
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

    this.reporterConfigOptions = {
      ctrfJsonOutputFile:
        reporterOptions?.ctrfJsonOutputFile ?? this.defaultOutputFile,
      ctrfJsonOutputDir:
        reporterOptions?.ctrfJsonOutputDir ?? this.defaultOutputDir,
      ctrfJsonAppName: reporterOptions?.ctrfJsonAppName ?? undefined,
      ctrfJsonAppVersion: reporterOptions?.ctrfJsonAppVersion ?? undefined,
      ctrfJsonOsPlatform: reporterOptions?.ctrfJsonOsPlatform ?? undefined,
      ctrfJsonOsRelease: reporterOptions?.ctrfJsonOsRelease ?? undefined,
      ctrfJsonOsVersion: reporterOptions?.ctrfJsonOsVersion ?? undefined,
      ctrfJsonBuildName: reporterOptions?.ctrfJsonBuildName ?? undefined,
      ctrfJsonBuildNumber: reporterOptions?.ctrfJsonBuildNumber ?? undefined,
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

    if (this.reporterConfigOptions?.ctrfJsonOutputFile !== undefined)
      this.setFilename(this.reporterConfigOptions.ctrfJsonOutputFile)

    if (
      !fs.existsSync(
        this.reporterConfigOptions.ctrfJsonOutputDir ?? this.defaultOutputDir
      )
    ) {
      fs.mkdirSync(
        this.reporterConfigOptions.ctrfJsonOutputDir ?? this.defaultOutputDir,
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

      if (
        this.reporterConfigOptions?.ctrfJsonOutputFile !== undefined &&
        this.reporterConfigOptions.ctrfJsonOutputFile !== ''
      ) {
        this.setFilename(this.reporterConfigOptions.ctrfJsonOutputFile)
      }
      summary.run.executions.forEach((execution) => {
        execution.assertions.forEach((assertion) => {
          this.ctrfReport.results.summary.tests += 1

          const testResult = {
            name: assertion.assertion,
            status:
              assertion.error != null
                ? ('failed' as CtrfTestState)
                : ('passed' as CtrfTestState),
            duration: execution.response.responseTime,
          }

          if (assertion.error != null) {
            this.ctrfReport.results.summary.failed += 1
          } else {
            this.ctrfReport.results.summary.passed += 1
          }

          this.ctrfReport.results.tests.push(testResult)
        })
      })
      this.ctrfReport.results.summary.stop = Date.now()
      this.writeReportToFile(this.ctrfReport)
    })
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  setEnvironmentDetails(reporterConfigOptions: ReporterConfigOptions): void {
    if (reporterConfigOptions.ctrfJsonAppName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.ctrfJsonAppName
    }
    if (reporterConfigOptions.ctrfJsonAppVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.ctrfJsonAppVersion
    }
    if (reporterConfigOptions.ctrfJsonOsPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.ctrfJsonOsPlatform
    }
    if (reporterConfigOptions.ctrfJsonOsRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.ctrfJsonOsRelease
    }
    if (reporterConfigOptions.ctrfJsonOsVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.ctrfJsonOsVersion
    }
    if (reporterConfigOptions.ctrfJsonBuildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.ctrfJsonBuildName
    }
    if (reporterConfigOptions.ctrfJsonBuildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber =
        reporterConfigOptions.ctrfJsonBuildNumber
    }
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  private writeReportToFile(data: CtrfReport): void {
    const filePath = path.join(
      this.reporterConfigOptions.ctrfJsonOutputDir ?? this.defaultOutputDir,
      this.filename
    )
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s/%s`,
        this.reporterConfigOptions.ctrfJsonOutputDir,
        this.filename
      )
    } catch (error) {
      console.error(`Error writing ctrf json report:, ${String(error)}`)
    }
  }
}

export = GenerateCtrfReport
