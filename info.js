var async = require("async"),
	fs = require("fs"),
	process = require("child_process"),
	tmp = require("tmp"),
	colors = require("colors/safe"),
	util = require("./util"),
	engine = require("./engine"),
	strings = require("./strings")
	;

module.exports = {
process:function(set, nconf, completion) {
	console.log("\nSample info");

	var soxOpts = engine.processMeta(set.files, set.meta, nconf);
	for (var i=0;i<set.files.length;i++) {
		console.dir(set.files[i]);
		console.dir(set.meta[i]);
		console.log(colors.gray("---"));
	} 
	completion();
},
}