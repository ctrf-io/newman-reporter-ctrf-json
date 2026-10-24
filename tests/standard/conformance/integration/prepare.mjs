import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	copyFileSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogue, checkEntry } from "../shared/checks.mjs";
import { expectedReport, metadata } from "../expected.mjs";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
export function integrationContext(root, diagnostics) {
	const scratch = mkdtempSync(path.join(tmpdir(), "ctrf-newman-installed-"));
	const run = (command, args, cwd, env = process.env) => {
		const result = spawnSync(command, args, {
			cwd,
			env,
			encoding: "utf8",
			timeout: 180000,
		});
		assert.ifError(result.error);
		assert.equal(result.signal, null);
		return result;
	};
	try {
		const packed = run(
			npm,
			["pack", "--json", "--pack-destination", scratch],
			root,
		);
		assert.equal(packed.status, 0, packed.stderr);
		const packageInfo = JSON.parse(packed.stdout)[0];
		assert.ok(packageInfo.files.some((file) => file.path === "dist/index.cjs"));
		assert.ok(packageInfo.files.some((file) => file.path === "dist/index.js"));
		assert.ok(
			packageInfo.files.every(
				(file) => !/^(tests|src|node_modules)\//u.test(file.path),
			),
			"Packed distribution must exclude test tooling and source",
		);
		const tarball = path.join(scratch, packageInfo.filename);
		const consumer = path.join(scratch, "consumer");
		mkdirSync(consumer);
		writeFileSync(
			path.join(consumer, "package.json"),
			JSON.stringify({ name: "newman-conformance-consumer", private: true }),
		);
		const installed = run(
			npm,
			[
				"install",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				"--save-exact",
				"newman@6.2.3",
				tarball,
			],
			consumer,
		);
		assert.equal(installed.status, 0, installed.stderr);
		const observer = path.join(
			consumer,
			"node_modules/newman-reporter-native-fixture",
		);
		mkdirSync(observer);
		writeFileSync(
			path.join(observer, "package.json"),
			JSON.stringify({
				name: "newman-reporter-native-fixture",
				main: "index.cjs",
			}),
		);
		copyFileSync(
			new URL("./observer.cjs", import.meta.url),
			path.join(observer, "index.cjs"),
		);
		const scenarios = [
			{ name: "full" },
			{ name: "repeated" },
			{ name: "minimal", minimal: true },
			{ name: "defaults", defaults: true },
			{ name: "empty", empty: true },
			{ name: "empty-run-id", runId: "" },
			{ name: "iterations", iterations: true },
			{ name: "cli", cli: true },
			{ name: "shard-one", shard: 0, shardId: "one" },
			{ name: "shard-two", shard: 1, shardId: "two" },
			...[0, 1.5, "Infinity", "invalid"].map((buildNumber) => ({
				name: `build-number-${buildNumber}`,
				buildNumber,
			})),
		];
		const samples = [];
		for (const scenario of scenarios) {
			const folder = path.join(scratch, scenario.name);
			mkdirSync(folder);
			const options = {
				...(scenario.defaults ? {} : metadata),
				...(scenario.minimal ? { minimal: true } : {}),
				...(scenario.runId !== undefined ? { runId: scenario.runId } : {}),
				...(scenario.shardId ? { shardId: scenario.shardId } : {}),
				...(scenario.buildNumber !== undefined
					? { buildNumber: scenario.buildNumber }
					: {}),
			};
			const config = {
				...scenario,
				consumer,
				options: { ...options, outputDir: folder, outputFile: "report.json" },
				collection: path.join(folder, "collection.json"),
				native: path.join(folder, "native.json"),
				requests: path.join(folder, "requests.json"),
			};
			const configFile = path.join(folder, "config.json");
			writeFileSync(configFile, JSON.stringify(config));
			const runWindow = [Date.now()];
			const result = run(
				process.execPath,
				[fileURLToPath(new URL("./run.cjs", import.meta.url)), configFile],
				consumer,
			);
			runWindow.push(Date.now());
			if (diagnostics) {
				mkdirSync(diagnostics, { recursive: true });
				writeFileSync(
					path.join(diagnostics, `newman-${scenario.name}.log`),
					result.stdout + result.stderr,
				);
				for (const file of ["native.json", "requests.json", "report.json"]) {
					const source = path.join(folder, file);
					if (existsSync(source))
						copyFileSync(
							source,
							path.join(diagnostics, `newman-${scenario.name}-${file}`),
						);
				}
				writeFileSync(
					path.join(diagnostics, `newman-${scenario.name}-exit.json`),
					JSON.stringify({ status: result.status, signal: result.signal }),
				);
			}
			assert.equal(
				result.status,
				scenario.empty || scenario.shard === 1 ? 0 : 1,
				`${scenario.name}: ${result.stdout} ${result.stderr}`,
			);
			const native = JSON.parse(readFileSync(config.native, "utf8"));
			const requests = JSON.parse(readFileSync(config.requests, "utf8"));
			for (const execution of native.executions) {
				assert.deepEqual(
					execution.parents,
					execution.itemId === "request-one" ? ["Outer", "Inner"] : ["Other"],
					"Independent folder ancestry",
				);
				for (const assertion of execution.assertions) {
					assert.equal(
						Boolean(assertion.error),
						assertion.name === "failure",
						"Controlled native failure must occur",
					);
					assert.equal(
						Boolean(assertion.skipped),
						assertion.name === "skip",
						"Controlled native skip must occur",
					);
				}
			}
			if (scenario.iterations)
				assert.deepEqual(
					[...new Set(native.executions.map((e) => e.iteration))],
					[0, 1],
					"Two actual Newman data iterations",
				);
			const wanted = scenario.empty
				? []
				: scenario.shard === 0
					? ["pass ✓", "failure", "skip"]
					: scenario.shard === 1
						? ["pass ✓"]
						: ["pass ✓", "failure", "skip", "pass ✓"];
			const assertions = native.executions.flatMap((e) =>
				e.assertions.map((a) => a.name),
			);
			assert.deepEqual(
				assertions,
				scenario.iterations ? [...wanted, ...wanted] : wanted,
				`${scenario.name}: independent assertion inventory`,
			);
			assert.equal(
				requests.length,
				scenario.empty
					? 0
					: scenario.shard !== undefined
						? 1
						: scenario.iterations
							? 4
							: 2,
			);
			const bytes = readFileSync(path.join(folder, "report.json"));
			samples.push({
				name: scenario.name,
				base64: bytes.toString("base64"),
				report: JSON.parse(bytes),
				expected: expectedReport(native, options),
				native,
				options,
				runWindow,
			});
		}
		// Exercise the checker against real serialized installed-package output,
		// independently of the producer's own positive examples.
		const full = samples.find((sample) => sample.name === "full");
		const control = {
			samples: [{ ...full, bytes: Buffer.from(full.base64, "base64") }],
			warnings: [],
		};
		checkEntry(
			catalogue.entries.find((entry) => entry.rule === "single-json-object"),
			control,
		);
		for (const [rule, mutate] of [
			[
				"single-json-object",
				(report) => {
					report.results.tests[0].duration = "invalid";
				},
			],
			[
				"single-json-object",
				(report) => {
					report.results.tests[0].retries = -1;
				},
			],
			[
				"summary-matches-final-results",
				(report) => {
					report.results.summary.passed++;
				},
			],
			[
				"declares-supported-contract",
				(report) => {
					report.specVersion = "9.9.9";
				},
			],
		]) {
			const report = structuredClone(full.report);
			mutate(report);
			assert.throws(
				() =>
					checkEntry(
						catalogue.entries.find((entry) => entry.rule === rule),
						{
							samples: [
								{
									name: "corrupted real output",
									report,
									bytes: Buffer.from(JSON.stringify(report)),
								},
							],
							warnings: [],
						},
					),
				`Checker accepted corrupted installed-package output: ${rule}`,
			);
		}
		return {
			samples,
			repeated: ["full", "repeated"],
			shards: ["shard-one", "shard-two"],
			warnings: [],
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}
