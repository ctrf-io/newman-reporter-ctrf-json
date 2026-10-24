import { runExpectedFailure } from "./shared/expected-failures.mjs";
import { checkEntry } from "./shared/checks.mjs";
export const expectedFailures = {};
export function expectedFailure() {
	return undefined;
}
export function runConformance(entry, context, level) {
	return runExpectedFailure(
		entry,
		context,
		level,
		expectedFailure(entry, level),
		checkEntry,
		() => false,
	);
}
