import { createRequire } from "node:module";
import Reporter from "newman-reporter-ctrf-json";

const require = createRequire(import.meta.url);

describe("package exports", () => {
	it("supports ESM default import from the package root", () => {
		expect(typeof Reporter).toBe("function");
	});

	it("supports CJS require from the package root", () => {
		const CjsReporter = require("newman-reporter-ctrf-json");

		expect(typeof CjsReporter).toBe("function");
	});
});
