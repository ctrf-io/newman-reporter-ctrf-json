import * as fs from 'fs'
import { type EventEmitter } from 'events'
import { type CtrfReport, type CtrfTestState } from '../types/ctrf'
import { type NewmanRunOptions, type NewmanRunSummary } from 'newman'

interface ReporterOptions {
  filename?: string
}

class GenerateCtrfReport {
  private readonly ctrfReport: CtrfReport
  private readonly reporterName = 'ctrf-json-reporter'
  private readonly defaultFilename = 'ctrf-report.json'
  private filename = this.defaultFilename

  constructor(
    private readonly emitter: EventEmitter,
    private readonly reporterOptions: ReporterOptions | undefined = undefined,
    private readonly collectionRunOptions: NewmanRunOptions
  ) {
    this.registerEvents()
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
  }

  private registerEvents(): void {
    this.emitter.on('done', (err, summary: NewmanRunSummary) => {
      if (err !== null || typeof summary === 'undefined') {
        return
      }

      if (
        this.reporterOptions?.filename !== undefined &&
        this.reporterOptions.filename !== ''
      ) {
        this.setFilename(this.reporterOptions.filename)
      }
      this.ctrfReport.results.summary.start = Date.now()
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
      this.writeToFile(this.filename, this.ctrfReport)
    })
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  private writeToFile(filename: string, data: CtrfReport): void {
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filename, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s`,
        filename
      )
    } catch (error) {
      console.error(`Error writing ctrf json report: ${String(error)}`)
    }
  }
}

export = GenerateCtrfReport
