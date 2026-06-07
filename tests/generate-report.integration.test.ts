import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "ctrf";
import GenerateCtrfReport from "../src/generate-report";

const createSummary = () => ({
	collection: {
		name: "Postman collection",
	},
	run: {
		executions: [
			{
				item: {
					name: "Get users",
					forEachParent: (callback: (parent: { name: string }) => void) => {
						callback({ name: "Users" });
					},
				},
				response: {
					responseTime: 123,
				},
				assertions: [
					{
						assertion: "status is 200",
					},
					{
						assertion: "body has id",
						error: {
							message: "expected id",
							stack: "AssertionError: expected id",
						},
					},
					{
						assertion: "optional check",
						skipped: true,
					},
				],
			},
		],
	},
});

describe("GenerateCtrfReport integration", () => {
	it("writes a parseable CTRF report from Newman summary events", () => {
		const outputDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "newman-ctrf-report-"),
		);
		const emitter = new EventEmitter();

		new GenerateCtrfReport(
			emitter,
			{
				outputDir,
				outputFile: "ctrf-report.json",
				testType: "api",
				buildName: "CI",
				buildNumber: "42",
			},
			{} as never,
		);

		emitter.emit("start");
		emitter.emit("done", null, createSummary());

		const reportPath = path.join(outputDir, "ctrf-report.json");
		const report = parse(fs.readFileSync(reportPath, "utf8"));

		expect(report.reportFormat).toBe("CTRF");
		expect(report.results.summary).toMatchObject({
			tests: 3,
			passed: 1,
			failed: 1,
			skipped: 1,
		});
		expect(report.results.tests).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "Get users: status is 200",
					status: "passed",
					duration: 123,
					suite: "Postman collection > Users",
					type: "api",
				}),
				expect.objectContaining({
					name: "Get users: body has id",
					status: "failed",
					message: "expected id",
					trace: "AssertionError: expected id",
				}),
			]),
		);
	});
});
