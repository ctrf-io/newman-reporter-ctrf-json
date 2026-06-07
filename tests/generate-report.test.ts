import { EventEmitter } from "node:events";
import GenerateCtrfReport from "../src/generate-report";

describe("GenerateCtrfReport", () => {
	it("normalizes CLI-prefixed reporter options", () => {
		const reporter = new GenerateCtrfReport(
			new EventEmitter(),
			{
				ctrfJsonOutputFile: "custom-report",
				ctrfJsonOutputDir: "custom-ctrf",
				ctrfJsonMinimal: true,
				ctrfJsonTestType: "api",
				ctrfJsonBuildName: "build",
			},
			{} as never,
		);

		expect(reporter.reporterConfigOptions).toMatchObject({
			outputFile: "custom-report",
			outputDir: "custom-ctrf",
			minimal: true,
			testType: "api",
			buildName: "build",
		});
		expect(reporter.filename).toBe("custom-report.json");
	});

	it("sets environment details when the run starts", () => {
		const emitter = new EventEmitter();
		const reporter = new GenerateCtrfReport(
			emitter,
			{
				appName: "api",
				buildName: "CI",
				buildNumber: "42",
			},
			{} as never,
		);

		emitter.emit("start");

		expect(reporter.ctrfReport.results.environment).toMatchObject({
			appName: "api",
			buildName: "CI",
			buildNumber: "42",
		});
	});
});
