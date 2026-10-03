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
				ctrfJsonBuildNumber: "42",
			},
			{} as never,
		);

		expect(reporter.reporterConfigOptions).toMatchObject({
			outputFile: "custom-report",
			outputDir: "custom-ctrf",
			minimal: true,
			testType: "api",
			buildName: "build",
			buildNumber: "42",
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
				buildNumber: 42,
			},
			{} as never,
		);

		emitter.emit("start");

		expect(reporter.ctrfReport.results.environment).toMatchObject({
			appName: "api",
			buildName: "CI",
			buildNumber: 42,
		});
	});

	it("normalizes CLI build numbers to the canonical numeric value", () => {
		const emitter = new EventEmitter();
		const reporter = new GenerateCtrfReport(
			emitter,
			{ ctrfJsonBuildNumber: "42" },
			{} as never,
		);

		emitter.emit("start");

		expect(reporter.ctrfReport.results.environment?.buildNumber).toBe(42);
	});
});
