const fs = require("node:fs");
// Newman constructs reporter modules with new; this must remain constructible.
// biome-ignore lint/complexity/useArrowFunction: Newman reporter constructor
module.exports = function (emitter) {
	emitter.on("done", (error, summary) => {
		if (error || !summary) return;
		const native = {
			collection: { id: summary.collection.id, name: summary.collection.name },
			executions: summary.run.executions.map((e) => {
				const parents = [];
				let parent = e.item.parent();
				while (parent?.parent()) {
					parents.unshift(parent.name);
					parent = parent.parent();
				}
				return {
					itemId: e.item.id,
					itemName: e.item.name,
					parents,
					iteration: e.cursor.iteration,
					responseTime: e.response?.responseTime,
					assertions: (e.assertions ?? []).map((a) => ({
						name: a.assertion,
						skipped: a.skipped,
						error: a.error
							? { message: a.error.message, stack: a.error.stack }
							: undefined,
					})),
				};
			}),
		};
		fs.writeFileSync(process.env.NEWMAN_NATIVE_RESULT, JSON.stringify(native));
	});
};
