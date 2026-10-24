import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import {
	catalogue,
	disposition,
	checkEntry,
} from "./standard/conformance/shared/checks.mjs";
import {
	emitSample,
	nativeFixture,
	unitContext,
} from "./standard/conformance/unit/fixtures.mjs";
import { recordsFromRun } from "./reporters/vitest.mjs";
const context = unitContext();
const sample = (name: string) => {
	const value = context.samples.find((s) => s.name === name);
	assert.ok(value, name);
	return value;
};
test("Newman tooling / pinned standard files match the reviewed snapshot", () => {
	const base = new URL("./standard/", import.meta.url);
	const manifest = JSON.parse(
		readFileSync(new URL("shared-files.json", base), "utf8"),
	);
	for (const [file, hash] of Object.entries(manifest.files))
		assert.equal(
			createHash("sha256")
				.update(readFileSync(new URL(file, base)))
				.digest("hex"),
			hash,
			file,
		);
});
test("Newman tooling / capabilities cover exactly the common inventory", () => {
	const manifest = JSON.parse(
		readFileSync(
			new URL("./standard/conformance/newman.json", import.meta.url),
			"utf8",
		),
	);
	for (const entry of catalogue.entries) disposition(entry, manifest);
	assert.deepEqual(
		Object.keys(manifest.properties).sort(),
		catalogue.entries
			.filter((e) => e.kind === "property")
			.map((e) => e.path)
			.sort(),
	);
	assert.deepEqual(
		Object.keys(manifest.rules).sort(),
		catalogue.entries
			.filter((e) => e.kind === "report")
			.map((e) => e.rule)
			.sort(),
	);
});
for (const [name, mutate, rule] of [
	[
		"invalid emitted duration",
		(r) => {
			r.results.tests[0].duration = "17";
		},
		"single-json-object",
	],
	[
		"invalid emitted optional field",
		(r) => {
			r.results.tests[0].retries = -1;
		},
		"single-json-object",
	],
	[
		"incorrect status counter",
		(r) => {
			r.results.summary.passed++;
		},
		"summary-matches-final-results",
	],
	[
		"unsupported declared version",
		(r) => {
			r.specVersion = "9.9.9";
		},
		"declares-supported-contract",
	],
] as const)
	test(`Newman tooling / rejects ${name}`, () => {
		const report = structuredClone(sample("full").report);
		mutate(report);
		const corrupted = {
			samples: [
				{
					name: "corrupted",
					report,
					bytes: Buffer.from(JSON.stringify(report)),
				},
			],
			warnings: [],
		};
		assert.throws(() =>
			checkEntry(
				catalogue.entries.find((e) => e.rule === rule),
				corrupted,
			),
		);
	});
test("Newman tooling / source oracle catches a schema-valid assertion mapping change", () => {
	const modified = structuredClone(sample("full"));
	modified.report.results.tests[0].name = "wrong assertion";
	assert.throws(() =>
		checkEntry(
			catalogue.entries.find((e) => e.path === "results.tests[].name"),
			{ samples: [modified] },
		),
	);
});
test("Newman behavior / invalid build numbers are omitted", () => {
	for (const name of [
		"build-number-number-1.5",
		"build-number-string-Infinity",
		"build-number-string-invalid",
	])
		assert.equal(sample(name).report.results.environment, undefined);
});
test("Newman behavior / zero build number survives numeric and string options", () => {
	for (const name of ["build-number-number-0", "build-number-string-0"])
		assert.equal(sample(name).report.results.environment.buildNumber, 0);
});
test("Newman behavior / empty run ID is omitted", () =>
	assert.equal(Object.hasOwn(sample("empty-run-id").report, "runId"), false));
test("Newman behavior / prefixed options map like programmatic options", () => {
	for (const key of ["environment"])
		assert.deepEqual(
			sample("cli-prefixed-options").report.results[key],
			sample("full").report.results[key],
		);
	assert.equal(
		sample("canonical-options-win").report.results.environment.appName,
		"canonical",
	);
});
test("Newman behavior / minimal mode omits suite and type but preserves failure details", () => {
	const tests = sample("minimal").report.results.tests;
	for (const t of tests) {
		assert.equal(Object.hasOwn(t, "suite"), false);
		assert.equal(Object.hasOwn(t, "type"), false);
	}
	assert.equal(tests[1].message, "expected 2 to equal 3");
	assert.ok(tests[1].trace);
});
test("Newman behavior / iterations remain separate executions without invented retries", () => {
	const tests = sample("iterations").report.results.tests;
	assert.equal(tests.length, 6);
	assert.equal(tests[0].testId, tests[3].testId);
	assert.notEqual(tests[0].executionId, tests[3].executionId);
	for (const t of tests)
		for (const field of ["retries", "retryAttempts", "flaky", "attemptId"])
			assert.equal(Object.hasOwn(t, field), false);
});
test("Newman behavior / duplicate names in different native items have different identity", () => {
	const tests = sample("full").report.results.tests;
	assert.equal(tests[0].name, tests[3].name);
	assert.notEqual(tests[0].testId, tests[3].testId);
});
test("Newman behavior / absent response maps duration to zero", () => {
	for (const t of sample("missing-response").report.results.tests)
		assert.equal(t.duration, 0);
});
test("Newman behavior / source inputs are unchanged by emission", () => {
	const input = nativeFixture();
	const before = structuredClone(input);
	emitSample("isolation", input);
	assert.deepEqual(input, before);
});
test("Reporter results / completed records preserve failures, pending and skipped", () => {
	const modes = [
		{ mode: "run", state: "passed" },
		{ mode: "run", state: "failed" },
		{ mode: "todo", state: "pending" },
		{ mode: "skip", state: "skipped" },
	];
	const modules = [
		{
			moduleId: "fixture.test.ts",
			children: {
				allTests: () =>
					modes.map((m, i) => ({
						name: `case-${i}`,
						options: { mode: m.mode },
						result: () => ({ state: m.state }),
						diagnostic: () => ({ duration: 4 }),
					})),
			},
			errors: () => [],
		},
	];
	const records = recordsFromRun(modules, []);
	assert.deepEqual(
		records.map((r) => r.status),
		["passed", "failed", "pending", "skipped"],
	);
});
test("Reporter results / module and unhandled errors remain visible", () => {
	const modules = [
		{
			moduleId: "broken.test.ts",
			children: { allTests: () => [] },
			errors: () => [{ message: "load failed" }],
		},
	];
	assert.deepEqual(
		recordsFromRun(modules, [{ message: "unhandled" }]).map((r) => r.status),
		["failed", "failed"],
	);
});
