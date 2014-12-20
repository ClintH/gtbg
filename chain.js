var async = require("async"),
	fs = require("fs"),
	process = require("child_process"),
	tmp = require("tmp"),
	path = require("path"),
	colors = require("colors/safe"),
	util = require("./util"),
	engine = require("./engine"),
	strings = require("./strings")
	;

module.exports = {
process:function(set, nconf, completion) {
	var me = this;
	async.waterfall([
		function(callback) {
			util.log("Pre-processing...")
			var soxOpts = engine.processMeta(set.files, set.meta, nconf);
			engine.preprocess(set.files, set.meta, soxOpts, nconf, callback);
		},
		function(callback) {
			util.log("Pre-processing...done")
		
			nconf.set("outputPathFinal", 
				strings.endsWithRemove(nconf.get("outputPath"), path.sep));

			nconf.set("outputPathFinal", 
				path.join(nconf.get("outputPath"), 
				path.basename(nconf.get("absBasePath"))) + ".wav");
			me.concat(set.files, set.meta, nconf, callback);
		},
		function(filename, callback) {
			util.logg("Concatenated samples");
			me.postprocess(filename, nconf, callback);
		},
		function(filename, callback) {
			// Move to output path
			if (fs.existsSync(nconf.get("outputPathFinal")) && !nconf.get("overwrite")) {
				return callback({msg:"Output file exists. Set 'overwrite' option to allow overwriting",
					output:nconf.get("outputPathFinal")
				})
			}
			fs.rename(filename, nconf.get("outputPathFinal"), function(err) {
				if (err) {
					var e = {};
					if (err.code == "EPERM") {
						e.msg = "Cannot rename temporary file to final output file (Permission denied)";
						e.fix = "Output file might be open in another application";
					}
					e.input = filename;
					e.output = nconf.get("outputPathFinal");
					e.raw = err;
					return callback(e);
				}
				callback(null, nconf.get("outputPathFinal"));
			});
		}
	], completion);
},

concat: function(files, meta, nconf, completion) {
	var inputFiles = "";
	for (var i=0;i<meta.length;i++) {
		inputFiles += meta[i].processedPath += " ";
	}
	tmp.file(function(err, outFile, fd, cleanupCallback) {
		outFile += ".wav";
		var cmd = nconf.get("soxBin") + " " + inputFiles + outFile;
		process.exec(cmd, function(err, stout, sterr) {
			if (err) return completion(
				{	msg: "Could not join files", 
					raw: sterr, 
					cmd: cmd,
					input: inputFiles,
					output: outFile,
					options: ""
				});
			completion(null, outFile);
		})
	});
},

postprocess: function(chain, nconf, completion) {
	var sox = ""

	// Post-process: add end padding
	if (nconf.get("chainLengths")) {
		var bestLength = 0;
		for (var i=0;i<nconf.get("chainLengths").length;i++) {
			if (nconf.get("chainLengths")[i] >= nconf.get("slices")) {
				bestLength = nconf.get("chainLengths")[i];
				break;
			}
		}
		var padBy = (bestLength-nconf.get("slices")) * nconf.get("sliceLength");

		// Pad out
		if (padBy > 0) {
			util.logg("Fitting chain with " + nconf.get("slices") + 
				" slices to a length of " + bestLength +
				" slices (+" + padBy + " samples)");
			sox += "pad 0 " + padBy + "s ";
		}
	}

	var outParams = util.getOutputParams(nconf);
	sox += outParams.sox;
	sox += nconf.get("post");
	util.logg("Output: " + outParams.human);

	// Post-process: apply normalisation
	if (nconf.get("showSoxOpts"))
		util.logg("   SoX: " + sox);

	tmp.file(function(err, outFile, fd, cleanupCallback) {
		outFile += ".wav";
		var cmd = nconf.get("soxBin") + " " + chain +" " + outParams.format +" " + outFile + " " + sox;
		//if (nconf.get("showSoxOpts"))
		//	console.log("   " + colors.blue("SoX") + " " + cmd);
		process.exec(cmd, function(err, stout, sterr) {
			if (err) return completion(
				{	msg: "Could not post-process chain", 
					raw: sterr, 
					cmd: cmd,
					input: chain,
					output: outFile,
					options: sox
				});
			completion(null, outFile);
		})
	});
}
}