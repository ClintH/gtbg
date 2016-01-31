var async = require('async'),
	process = require("child_process"),
	tmp = require("tmp"),
	fs = require("fs"),
	util = require("./util"),
	sox = require("./sox"),
	strings = require("./strings")
;

module.exports = {
processMeta:function(files, meta, preset) {
	var soxOpts = new Array(files.length);

	// Find longest
	var longestLength = [0,0];
	var longestIndex = -1;
	var runningAvg = [0,0];
	for (var i=0;i<meta.length;i++) {
		if (meta[i].samples > longestLength[0]) {
			longestLength = [meta[i].samples, meta[i].duration];
			longestIndex = i;
		}
		runningAvg[0] += meta[i].samples;
		runningAvg[1] += meta[i].duration;

		soxOpts[i] = [];
	}
	runningAvg[0] = (runningAvg[0]-longestLength[0])/(meta.length-1);
	runningAvg[1] = (runningAvg[1]-longestLength[1])/(meta.length-1);

	util.logg("Longest file is " + longestLength[0] + " samples / " + longestLength[1] + "ms (" + files[longestIndex] + ")");
	if (meta.length > 1)
	util.logg("Average length is otherwise " + parseInt(runningAvg[0]) + " samples / " + parseInt(runningAvg[1]) + "ms");

	var slicing = false;
	if (preset.sliceLength == "auto") {
		preset.sliceLength = longestLength[0];
		if (preset.sliceLengthMax && (preset.sliceLength > preset.sliceLengthMax)) {
			util.logg("Using max auto slice length (" + preset.sliceLengthMax + " samples)");
			preset.sliceLength = preset.sliceLengthMax;
		} else {
			util.logg("Automatic slice length is " + longestLength[0] + " samples");
		}
		slicing = true;
	} else {
		if (typeof(preset.sliceLength) !== 'undefined')
			util.logg("Using set slice length of " + preset.sliceLength + " samples.");
	}
	preset.slices = meta.length;

	// Calculate triming/padding if we are creating a chain
	if (preset.sliceLength) {
		for (var i=0;i<meta.length;i++) {
			var diff = preset.sliceLength - meta[i].samples;
			if (diff < 0) {
				meta[i].padBy = 0;
				meta[i].trimTo = preset.sliceLength;
			} else {
				meta[i].padBy = diff;
			}
		}
	} else {
		for (var i=0;i<files.length;i++) meta[i].padBy = 0;
	}

	// Final round up
	for (var i=0;i<meta.length;i++) {
		// Convert trim/pad settings to SoX parameters
		if (meta[i].trimTo) {
			soxOpts[i].push("trim 0 " + meta[i].trimTo+"s");
		}
		if (meta[i].padBy) {
			soxOpts[i].push("pad 0 " + meta[i].padBy+"s");
		}

		// 'Upgrade' mono channels to stereo
		//if (slicing && meta[i].channels == 1) {
		if (meta[i].channels == 1 && !preset.removeStereo) {
			soxOpts[i].push("channels 2");
		}
		// Change sample rate if necessary
		if (meta[i].sampleRate !== preset.sampleRate) {
			soxOpts[i].push("rate " + preset.sampleRate);
		}
	}
	return soxOpts;
},

preprocess:function(files, meta, soxOpts, preset, completion) {
	var jobs = [];
	for (var i=0;i<files.length;i++) {
		jobs.push({
			file: files[i],
			index: i,
			meta: meta[i],
			sox: soxOpts[i]
		});
	}

	async.eachLimit(jobs, 2,
		function(job, cb) {
			var opts = job.sox.join(" ");
			tmp.file(function(err, outFile, fd, cleanupCallback) {
				if (err) return cb(err);
				outFile += ".wav";
				var cmd = sox.fullPath() + " \"" +
					job.meta.fullPath + "\" " +
					outFile + " " +
					opts;
				if (preset.showSoxOpts && opts.length > 1)
						util.logg("SoX: " + opts);
				process.exec(cmd, function(err, stout, sterr) {
					if (err) return cb(
						{	msg: "Could not preprocess",
							raw: sterr,
							cmd: cmd,
							input: job.meta.fullPath,
							output: outFile,
							options: opts
						});
					meta[job.index].processedPath = outFile;
					cb(null);
				});
			});
		}, function(err) {
			completion(err);
		}
	);
},

parseSoxInfo:function(stout, meta) {
	var lines = stout.trim().split("\n");

	for (var i=0;i<lines.length;i++) {
		lines[i] = strings.endsWithRemove(lines[i], "\r");
		if (lines[i].length === 0) continue;
		var lineSplit = lines[i].split(": ");
		if (lineSplit.length !== 2) {
			util.loge("Expected two tokens: " + lines[i]);
		}
		lineSplit[0] = lineSplit[0].trim();
		lineSplit[1] = lineSplit[1].trim();
		if (lineSplit[0] == "Sample Rate") meta.sampleRate = parseFloat(lineSplit[1]);
		else if (lineSplit[0] == "Channels") meta.channels = parseInt(lineSplit[1]);
		else if (lineSplit[0] == "Duration") {
			meta.duration = lineSplit[1];
			lineSplit[1] = lineSplit[1].replace("~", "="); // fluff over
			var split = strings.splitTrim(lineSplit[1], " = ");

			// Not sure why, but moment.duration() seems unable to parse properly
			meta.durationOrig = split[0];
			var durationSplit = meta.durationOrig.split(":");
			var ms = 0;
			if (durationSplit.length == 3) {
				ms = parseInt(durationSplit[0]) * 60 * 60 * 1000;
				ms += parseInt(durationSplit[1]) * 60 * 1000;
				ms += parseFloat(durationSplit[2]) * 1000;
			}
			meta.duration =ms;
			meta.samples = parseInt(strings.upTo(split[1], " "));
			meta.sectors = strings.upTo(split[2], " ");
		}
		else if (lineSplit[0] == "Bit Rate") meta.bitRate = lineSplit[1];
		else if (lineSplit[0] == "Sample Encoding") meta.encoding = lineSplit[1];
	}
	return meta;
},

getMetadataForFile: function(meta, completion) {
	var me = this;
	var cmd = sox.fullPath() + " --i \"" + meta.fullPath + "\"";
	var ps = process.exec(cmd, function(err, stout, sterr) {
		if (err) {
			console.log(err.stack);
			console.log("Code: " + err.code);
			console.log("Signal: " + err.signal);
			console.log("Msg: " + sterr);
			var e ={msg: "Could not look up metadata", raw: err, path: meta.fullPath};
			if (!fs.existsSync(sox.fullPath())) {
				e.fix = "Is Sox located at " + sox.fullPath() +"?";
			}
			return completion(e);
		}
		completion(null, me.parseSoxInfo(stout, meta));
	});
},

getMetadata: function(files, path, completion) {
	var me = this;
	async.mapSeries(files, function(file, cb) {
		if (file.indexOf(".") < 0) return cb(null); // Seems to be a directory, skip
		var fullPath = path + file;
		var meta = {
			path: path,
			fullPath: fullPath
		};
		me.getMetadataForFile(meta, cb);
	}, completion);
}
};
