var async = require('async'),
	process = require("child_process"),
	tmp = require("tmp"),
	fs = require("fs"),
	util = require("./util"),
	strings = require("./strings")
;

module.exports = {
processMeta:function(files, meta, nconf) {
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
	if (nconf.get("sliceLength") == "auto") {
		nconf.set("sliceLength", longestLength[0]);
		if (nconf.get("sliceLengthMax") && (nconf.get("sliceLength") > nconf.get("sliceLengthMax"))) {
			util.logg("Using max auto slice length (" + nconf.get("sliceLengthMax") + " samples)");
			nconf.set("sliceLength", nconf.get("sliceLengthMax"));
		} else {
			util.logg("Automatic slice length is " + longestLength[0] + " samples");
		}
		slicing = true;
	} else {
		if (typeof(nconf.get("sliceLength")) !== 'undefined')
			util.logg("Using set slice length of " + nconf.get("sliceLength") + " samples.");
	}
	nconf.set("slices", meta.length);

	// Calculate triming/padding if we are creating a chain
	if (nconf.get("sliceLength")) {
		for (var i=0;i<meta.length;i++) {
			var diff = nconf.get("sliceLength") - meta[i].samples;
			if (diff < 0) {
				meta[i].padBy = 0;
				meta[i].trimTo = nconf.get("sliceLength");
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
		if (meta[i].channels == 1) {
			soxOpts[i].push("channels 2");
		}
		// Change sample rate if necessary
		if (meta[i].sampleRate !== nconf.get("sampleRate")) {
			soxOpts[i].push("rate " + nconf.get("sampleRate"));	
		}
	}
	return soxOpts;
},

preprocess:function(files, meta, soxOpts, nconf, completion) {
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
				outFile += ".wav"
				var cmd = nconf.get("soxBin") + " \"" + 
					job.meta.fullPath + "\" " + 
					outFile + " " + 
					opts;
				if (nconf.get("showSoxOpts") && opts.length > 1)
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
			completion(err)
		}
	);
},

getMetadata: function(files, path, nconf, completion) { 
	async.mapSeries(files, function(file, cb) {
		if (file.indexOf(".") < 0) {
			// Seems to be a directory
			return cb(null);
		}
		var fullPath = path + file;
	
		var soxPath = nconf.get("soxBin");
		var cmd = soxPath + " --i \"" + fullPath + "\"";
		var ps = process.exec(cmd, function(err, stout, sterr) {
			if (err) {
				//console.log(err.stack);
				//console.log("Code: " + err.code);
				//console.log("Signal: " + err.signal);
				//console.log("Msg: " + sterr);
				var e ={msg: "Could not look up metadata", raw: err, path: fullPath};
				if (!fs.existsSync(soxPath)) {
					e.fix = "Is Sox located at " + soxPath +"?"; 
				} 
				return cb(e);
			} else {
				var lines = stout.trim().split("\n");
				var meta = {
					path: path,
					fullPath: fullPath
				};
				for (var i=0;i<lines.length;i++) {
					lines[i] = strings.endsWithRemove(lines[i], "\r");
					if (lines[i].length == 0) continue;
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
				cb(null, meta);
			}

		});
	}, completion);
}
}