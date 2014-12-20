var async = require("async"),
	fs = require("fs"),
	process = require("child_process"),
	tmp = require("tmp"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	colors = require("colors/safe"),
	util = require("./util"),
	engine = require("./engine"),
	strings = require("./strings")
	;

module.exports = {
process:function(set, nconf, completion) {
	var me = this;
	if (nconf.get("prefix")) {
		var v = parseFloat(nconf.get("prefix"));
		if (v < 0) return completion({msg:"prefix parameter must be at least 0.0"});
		else if (v > 1) return completion({msg:"prefix parameter cannot be larger than 1.0"});
	}
	async.waterfall([
		function(callback) {
			util.log("Pre-processing...")
			var soxOpts = engine.processMeta(set.files, set.meta, nconf);
			var outParams = util.getOutputParams(nconf);
			
			for (var i = set.files.length - 1; i >= 0; i--) {
				// Pad samples if requested
				if (nconf.get("prefix")) {
					var prefixBy = parseInt(parseFloat(nconf.get("prefix")) * set.meta[i].samples);
					soxOpts[i].push("pad " + prefixBy + "s 0s");
				}

				// Sprinkle in output parameters
				soxOpts[i].push(outParams.sox);

				// Add user-configured params
				if (nconf.get("post"))
					soxOpts[i].push(nconf.get("post"))				
			}

			engine.preprocess(set.files, set.meta, soxOpts, nconf, callback);
		},
		function(callback) {
			util.log("Pre-processing...done")

			nconf.set("outputPathFinal", 
				strings.endsWithRemove(nconf.get("outputPath"), path.sep));
			nconf.set("outputPathFinal", 
				path.join(nconf.get("outputPath"), 
				path.basename(nconf.get("absBasePath"))));

			mkdirp(nconf.get("outputPathFinal"), function(err) {
				if (err) return callback(err);
				me.renameFiles(set, nconf, callback);
			})
		}
	], completion);
},

renameFiles: function(set, nconf, callback) {
	async.forEachSeries(
	  set.meta, 
	  function(item, cb) {
			// Move to output path
			var outputPath = nconf.get("outputPathFinal")+path.sep + path.basename(item.fullPath);
			console.log(outputPath);
			if (fs.existsSync(outputPath) && !nconf.get("overwrite")) {
				return cb({msg:"Output file exists. Set 'overwrite' option to allow overwriting",
					output:nconf.get(outputPath)
				})
			}
			fs.rename(item.processedPath, outputPath, function(err) {
				if (err) {
					var e = {};
					if (err.code == "EPERM") {
						e.msg = "Cannot rename temporary file to final output file (Permission denied)";
						e.fix = "Output file might be open in another application";
					} else {
						e.msg = "Cannot rename temporary file to final output file";
					}
					e.input = item.processedPath;
					e.output = outputPath;
					e.raw = err;
					return cb(e);
				}
				cb();
			});
	  }, 
	  function(err) {
	  	callback(err);
	  }
	);
}
}
