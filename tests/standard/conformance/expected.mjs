export const metadata = {
	runId: "controlled-run",
	shardId: "one",
	testType: "api",
	appName: "fixture",
	appVersion: "1.2.3",
	osPlatform: "linux",
	osRelease: "controlled",
	osVersion: "6",
	buildName: "build",
	buildNumber: "42",
	buildUrl: "https://example.com/build/42",
	repositoryName: "fixture",
	repositoryUrl: "https://example.com/repository",
	branchName: "main",
	testEnvironment: "test",
};
export function expectedReport(native, options) {
	const tests = native.executions.flatMap((execution) =>
		execution.assertions.map((assertion) => {
			const test = {
				name: `${execution.itemName}: ${assertion.name}`,
				status: assertion.error
					? "failed"
					: assertion.skipped
						? "skipped"
						: "passed",
				duration: execution.responseTime ?? 0,
			};
			if (
				!options.minimal ||
				String(options.minimal).toLowerCase() === "false"
			) {
				test.suite = [native.collection.name, ...execution.parents];
				if (options.testType !== undefined) test.type = options.testType;
			}
			if (assertion.error) {
				test.message = assertion.error.message;
				test.trace = assertion.error.stack;
			}
			if (options.customIdentity) test.testId = `custom:${assertion.name}`;
			return test;
		}),
	);
	const environment = Object.fromEntries(
		Object.entries(options).filter(
			([key]) => key in metadata && !["runId", "testType"].includes(key),
		),
	);
	if (environment.buildNumber !== undefined) {
		const value = Number(environment.buildNumber);
		if (Number.isInteger(value)) environment.buildNumber = value;
		else delete environment.buildNumber;
	}
	const summary = { tests: tests.length };
	for (const status of ["passed", "failed", "skipped", "pending", "other"])
		summary[status] = tests.filter((test) => test.status === status).length;
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		generatedBy: "newman-reporter-ctrf-json",
		...(options.runId ? { runId: options.runId } : {}),
		results: {
			tool: { name: "newman" },
			summary,
			tests,
			...(Object.keys(environment).length ? { environment } : {}),
		},
	};
}
export function linkContext(samples) {
	return {
		samples,
		repeated: samples.filter((s) => ["full", "repeated"].includes(s.name)),
		shards: samples.filter((s) => s.name.startsWith("shard-")),
		warnings: [],
	};
}
