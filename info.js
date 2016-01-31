var
	_	= require("lodash"),
	chalk = require("chalk"),
	engine = require("./engine"),
	strings = require("./strings")
	;

module.exports = {
process:function(set, preset, completion) {
	console.log("\nSample info");

	var soxOpts = engine.processMeta(set.files, set.meta, preset);
	for (var i=0;i<set.files.length;i++) {
		console.log(set.files[i]);
		_.forIn(set.meta[i], function(v,k) {
			if (k == "fullPath") return;
			if (k == "padBy") return;

			console.log(chalk.gray(" " + k + ": ") + chalk.dim(v));
		});
		console.log("");
	}
	completion();
},
};
