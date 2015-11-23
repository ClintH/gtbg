var async = require("async"),
	fs = require("fs"),
	process = require("child_process"),
	tmp = require("tmp"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	util = require("./util"),
	engine = require("./engine"),
	strings = require("./strings"),
	presets = require("./presets")
	;

module.exports = {
process:function(set, preset, completion) {
	var me = this;
	
	if (preset.prefix) {
		var v = parseFloat(preset.prefix);
		if (v < 0) return completion({msg:"prefix parameter must be at least 0.0"});
		else if (v > 1) return completion({msg:"prefix parameter cannot be larger than 1.0"});
	}
	async.waterfall([
		function(callback) {
			util.log("Pre-processing...")
			var soxOpts = engine.processMeta(set.files, set.meta, preset);
			var outParams = presets.getOutputParams(preset);
			
			for (var i = set.files.length - 1; i >= 0; i--) {
				// Pad samples if requested
				if (preset.prefix) {
					var prefixBy = parseInt(parseFloat(preset.prefix) * set.meta[i].samples);
					soxOpts[i].push("pad " + prefixBy + "s 0s");
				}

				// Sprinkle in output parameters
				soxOpts[i].push(outParams.sox);

				// Add user-configured params
				if (preset.post)
					soxOpts[i].push(preset.post)				
			}

			engine.preprocess(set.files, set.meta, soxOpts, preset, callback);
		},
		function(callback) {
			util.log("Pre-processing...done")

			preset.outputPathFinal =
				strings.endsWithRemove(preset.outputPath, path.sep);
			preset.outputPathFinal = 
				path.join(preset.outputPath), 
				path.basename(preset.absBasePath);

			mkdirp(preset.outputPathFinal, function(err) {
				if (err) return callback(err);
				me.renameFiles(set, preset, function(err) {
					if (err) return callback(err);
					util.logg("Output files to: " + preset.outputPathFinal);
					callback(null);
				});
			})
		}
	], completion);
},

renameFiles: function(set, preset, callback) {
	async.forEachSeries(
	  set.meta, 
	  function(item, cb) {
			// Move to output path
			var outputPath = preset.outputPathFinal+path.sep + path.basename(item.fullPath);
			if (fs.existsSync(outputPath) && !preset.overwrite) {
				return cb({msg:"Output file exists. Set 'overwrite' option to allow overwriting",
					output:preset.outputPath
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
