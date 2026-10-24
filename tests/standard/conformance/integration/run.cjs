const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const newman = require(path.join(config.consumer, "node_modules/newman"));
const requests = [];
const server = http.createServer((req, res) => {
	requests.push(req.url);
	res.setHeader("content-type", "application/json");
	res.end(JSON.stringify({ ok: true }));
});
server.listen(0, "127.0.0.1", async () => {
	try {
		const url = `http://127.0.0.1:${server.address().port}/fixture`;
		const item = (id, name, script) => ({
			id,
			name,
			request: { method: "GET", url },
			event: [
				{ listen: "test", script: { type: "text/javascript", exec: script } },
			],
		});
		const mixed = [
			"pm.test('pass ✓', function(){ pm.response.to.have.status(200); });",
			"pm.test('failure',function(){pm.expect(2).to.equal(3);});",
			"pm.test.skip('skip',function(){});",
		];
		let items = [
			{
				id: "folder-one",
				name: "Outer",
				item: [
					{
						id: "folder-inner",
						name: "Inner",
						item: [item("request-one", "Request", mixed)],
					},
				],
			},
			{
				id: "folder-two",
				name: "Other",
				item: [item("request-two", "Request", [mixed[0]])],
			},
		];
		if (config.shard === 0 || config.shard === 1) items = [items[config.shard]];
		if (config.empty) items = [];
		const collection = {
			info: {
				_postman_id: "78862729-63af-4456-a156-2872c7be8270",
				name: "Collection ✓",
				schema:
					"https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
			},
			item: items,
		};
		fs.writeFileSync(config.collection, JSON.stringify(collection));
		process.env.NEWMAN_NATIVE_RESULT = config.native;
		let exitCode;
		if (config.cli) {
			const args = [
				path.join(config.consumer, "node_modules/newman/bin/newman.js"),
				"run",
				config.collection,
				"-r",
				"ctrf-json,native-fixture",
			];
			for (const [key, value] of Object.entries(config.options))
				args.push(
					`--reporter-ctrf-json-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
					String(value),
				);
			const child = spawn(process.execPath, args, {
				cwd: config.consumer,
				env: process.env,
				stdio: "inherit",
			});
			exitCode = await new Promise((resolve, reject) => {
				child.once("error", reject);
				child.once("close", resolve);
			});
		} else {
			exitCode = await new Promise((resolve, reject) =>
				newman.run(
					{
						collection,
						reporters: ["ctrf-json", "native-fixture"],
						reporter: { "ctrf-json": config.options },
						iterationData: config.iterations
							? [{ row: 1 }, { row: 2 }]
							: undefined,
					},
					(err, summary) =>
						err ? reject(err) : resolve(summary.run.failures.length ? 1 : 0),
				),
			);
		}
		fs.writeFileSync(config.requests, JSON.stringify(requests));
		server.close(() => {
			process.exitCode = exitCode;
		});
	} catch (error) {
		console.error(error);
		server.close(() => {
			process.exitCode = 2;
		});
	}
});
