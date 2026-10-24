import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expectedReport, linkContext, metadata } from "../expected.mjs";
const require = createRequire(import.meta.url);
const Reporter = require("../../../../dist/index.cjs");
export function nativeFixture() {
	return {
		collection: { id: "collection-fixed", name: "Collection ✓" },
		executions: [
			{
				itemId: "request-one",
				itemName: "Request",
				parents: ["Outer", "Inner"],
				responseTime: 17,
				assertions: [
					{ name: "pass ✓" },
					{
						name: "failure",
						error: {
							message: "expected 2 to equal 3",
							stack: "AssertionError: expected 2 to equal 3",
						},
					},
					{ name: "skip", skipped: true },
				],
			},
			{
				itemId: "request-two",
				itemName: "Request",
				parents: ["Other"],
				responseTime: 0,
				assertions: [{ name: "pass ✓" }],
			},
		],
	};
}
export function emitSample(
	name,
	native,
	options = {},
	expectedOptions = options,
) {
	const scratch = mkdtempSync(path.join(tmpdir(), "ctrf-newman-unit-"));
	try {
		const emitter = new EventEmitter();
		const runWindow = [Date.now()];
		new Reporter(
			emitter,
			{
				...options,
				outputDir: scratch,
				outputFile: "report.json",
				...(options.customIdentity
					? { testIdResolver: ({ name }) => `custom:${name}` }
					: {}),
			},
			{},
		);
		emitter.emit("start");
		emitter.emit("done", null, {
			collection: native.collection,
			run: {
				executions: native.executions.map((e) => ({
					item: {
						id: e.itemId,
						name: e.itemName,
						forEachParent: (callback) =>
							[...e.parents].reverse().forEach((name) => {
								callback({ name });
							}),
					},
					response:
						e.responseTime === undefined
							? undefined
							: { responseTime: e.responseTime },
					assertions: e.assertions.map((a) => ({
						assertion: a.name,
						skipped: a.skipped,
						error: a.error,
					})),
				})),
			},
		});
		runWindow.push(Date.now());
		const bytes = readFileSync(path.join(scratch, "report.json"));
		return {
			name,
			bytes,
			report: JSON.parse(bytes),
			expected: expectedReport(native, expectedOptions),
			runWindow,
			native,
			options,
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}
export function unitContext() {
	const native = nativeFixture();
	const prefixed = Object.fromEntries(
		Object.entries(metadata).map(([key, value]) => [
			`ctrfJson${key[0].toUpperCase()}${key.slice(1)}`,
			value,
		]),
	);
	const samples = [
		emitSample("cli-prefixed-options", native, prefixed, metadata),
		emitSample(
			"canonical-options-win",
			native,
			{ ...prefixed, appName: "canonical" },
			{ ...metadata, appName: "canonical" },
		),
		emitSample("full", native, metadata),
		emitSample("repeated", native, metadata),
		emitSample("minimal", native, { ...metadata, minimal: true }),
		emitSample("defaults", native),
		emitSample("empty", { ...native, executions: [] }),
		emitSample("empty-run-id", native, { runId: "" }),
		emitSample("custom-identity", native, { customIdentity: true }),
	];
	for (const buildNumber of [0, "0", 1.5, "Infinity", "invalid"])
		samples.push(
			emitSample(`build-number-${typeof buildNumber}-${buildNumber}`, native, {
				buildNumber,
			}),
		);
	samples.push(
		emitSample("missing-response", {
			...native,
			executions: [{ ...native.executions[0], responseTime: undefined }],
		}),
	);
	samples.push(
		emitSample("iterations", {
			...native,
			executions: [native.executions[0], native.executions[0]],
		}),
	);
	for (const [index, shardId] of ["one", "two"].entries())
		samples.push(
			emitSample(
				`shard-${shardId}`,
				{ ...native, executions: [native.executions[index]] },
				{ ...metadata, shardId },
			),
		);
	return linkContext(samples);
}
