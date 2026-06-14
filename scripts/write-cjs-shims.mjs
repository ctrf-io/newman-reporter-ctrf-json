import { writeFileSync } from "node:fs";

writeFileSync(
	"dist/index.cjs",
	`"use strict";

const mod = require("./index.generated.cjs");

module.exports = mod.default || mod;
`,
);
