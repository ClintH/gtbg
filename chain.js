var async = require("async"),
	fs = require("fs-extra"),
	process = require("child_process"),
	tmp = require("tmp"),
	path = require("path"),
	util = require("./util"),
	engine = require("./engine"),
	strings = require("./strings"),
	sox = require("./sox"),
	presets = require("./presets")
	;

module.exports = {
process:function(set, preset, completion) {
	if (typeof set.files == 'undefined') throw new Error("No set");

	var me = this;
	async.waterfall([
		function(callback) {
			util.log("Pre-processing...");
			var soxOpts = engine.processMeta(set.files, set.meta, preset);
			engine.preprocess(set.files, set.meta, soxOpts, preset, callback);
		},
		function(callback) {
			util.log("Pre-processing...done");

			preset.outputPathFinal =
				strings.endsWithRemove(preset.outputPath, path.sep);

			var file = path.basename(preset.absBasePath);
			if (preset.appendSliceCount) {
				file += "-" + preset.slices;
			}

			preset.outputPathFinal =
				path.join(preset.outputPath,
				file + ".wav");
			me.concat(set.files, set.meta, preset, callback);
		},
		function(filename, callback) {
			util.logg("Concatenated samples");
			me.postprocess(filename, preset, callback);
		},
		function(filename, callback) {
			// Move to output path
			if (fs.existsSync(preset.outputPathFinal) && !preset.overwrite) {
				return callback({msg:"Output file exists. Set 'overwrite' option to allow overwriting",
					output:preset.outputPathFinal
				});
			}

			fs.move(filename, preset.outputPathFinal, {clobber:true}, function(err) {
				if (err) {
					var e = {};
					if (err.code == "EPERM") {
						e.msg = "Cannot rename temporary file to final output file (Permission denied)";
						e.fix = "Output file might be open in another application";
					}
					e.input = filename;
					e.output = preset.outputPathFinal;
					e.raw = err;
					return callback(e);
				}
				util.logg("Output: " + preset.outputPathFinal);
				callback(null, preset.outputPathFinal);
			});
		}
	], completion);
},

concat: function(files, meta, preset, completion) {
	var inputFiles = "";
	for (var i=0;i<meta.length;i++) {
		inputFiles += meta[i].processedPath += " ";
	}
	tmp.file(function(err, outFile, fd, cleanupCallback) {
		outFile += ".wav";
		var cmd = sox.fullPath() + " " + inputFiles + outFile;
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
		});
	});
},

postprocess: function(chain, preset, completion) {
	var soxCmd = "";

	// Post-process: add end padding
	if (preset.chainLengths) {
		var bestLength = 0;
		for (var i=0;i<preset.chainLengths.length;i++) {
			if (preset.chainLengths[i] >= preset.slices) {
				bestLength = preset.chainLengths[i];
				break;
			}
		}
		var padBy = (bestLength-preset.slices) * preset.sliceLength;

		// Pad out
		if (padBy > 0) {
			util.logg("Fitting chain with " + preset.slices +
				" slices to a length of " + bestLength +
				" slices (+" + padBy + " samples)");
			soxCmd += "pad 0 " + padBy + "s ";
		}
	}

	var outParams = presets.getOutputParams(preset);
	soxCmd += outParams.sox;
	if (preset.post)
		soxCmd += " " + preset.post;
	util.logg("Output: " + outParams.human);

	// Post-process: apply normalisation
	if (preset.showSoxOpts)
		util.logg("   SoX: " + soxCmd);

	tmp.file(function(err, outFile, fd, cleanupCallback) {
		outFile += ".wav";
		var cmd = sox.fullPath() + " " + chain +" " + outParams.format +" " + outFile + " " + soxCmd;
		process.exec(cmd, function(err, stout, sterr) {
			if (err) return completion(
				{	msg: "Could not post-process chain",
					raw: sterr,
					cmd: cmd,
					input: chain,
					output: outFile,
					options: soxCmd
				});
			completion(null, outFile);
		});
	});
}
};
