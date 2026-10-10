import { describe, it, expect } from "vitest";
import { identityValue, runIdentity, testIdentity } from "../src/identity";

describe("identity semantics", () => {
	it("normalizes paths but preserves suite component boundaries", () => {
		const a = {
			name: "same",
			suite: ["a/b", "c"],
			filePath: "tests\\example.ts",
		};
		expect(testIdentity("runner", a)).toBe(
			testIdentity("runner", { ...a, filePath: "tests/example.ts" }),
		);
		expect(testIdentity("runner", a)).not.toBe(
			testIdentity("runner", { ...a, suite: ["a", "b/c"] }),
		);
		expect(testIdentity("runner", a)).not.toBe(
			testIdentity("runner", { ...a, filePath: "tests/other.ts" }),
		);
	});
	it("shares configured run identity and creates independent standalone runs", () => {
		expect(runIdentity("coordinated-run")).toBe("coordinated-run");
		expect(runIdentity()).not.toBe(runIdentity());
		expect(() => identityValue(" ", "shardId")).toThrow();
	});
	it("supports an explicit case resolver without allowing empty identity", () => {
		expect(
			testIdentity(
				"runner",
				{ name: "duplicate" },
				{ testIdResolver: () => "stable-case" },
			),
		).toBe("stable-case");
		expect(() =>
			testIdentity(
				"runner",
				{ name: "duplicate" },
				{ testIdResolver: () => "" },
			),
		).toThrow();
	});
});

import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Reporter from "../src/generate-report";
it("represents collection iterations as separate executions of one logical assertion", () => {
	const outputDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "ctrf-newman-identity-"),
	);
	try {
		const emitter = new EventEmitter();
		const reporter = new Reporter(
			emitter,
			{
				outputDir,
				ctrfJsonRunId: "run",
				ctrfJsonShardId: "one",
				minimal: true,
			},
			{} as never,
		);
		const execution = {
			item: { name: "request", id: "item", forEachParent: () => {} },
			response: { responseTime: 1 },
			assertions: [{ assertion: "same" }],
		};
		emitter.emit("start");
		emitter.emit("done", null, {
			collection: { name: "collection", id: "collection" },
			run: { executions: [execution, execution] },
		});
		const [one, two] = reporter.ctrfReport.results.tests;
		expect(one.testId).toBe(two.testId);
		expect(one.executionId).not.toBe(two.executionId);
		expect(reporter.ctrfReport.runId).toBe("run");
		expect(reporter.ctrfReport.results.environment?.shardId).toBe("one");
	} finally {
		fs.rmSync(outputDir, { recursive: true, force: true });
	}
});
