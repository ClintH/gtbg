"use strict";
var inquirer = require("inquirer"),
	fs = require("fs"),
	async = require("async"),
	util = require("util"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	chalk = require("chalk"),
	_ = require("lodash"),
	argv = require("yargs").argv,
	config = require("./config"),
	strings = require("./strings"),
	util = require("./util"),
	engine = require("./engine"),
	sox = require("./sox"),
	presets = require("./presets")
	;

console.log("\n " + chalk.white.bgRed("/_") + " gtbg\n");

//console.dir(argv);

config.init(); // Load from config
config.layerArgs(argv); // Add in commandline overrides
presets.init();

if (!sox.exists()) {
  sox.install();
} else {
	// Sox is installed
	if (argv._.length == 0) { // No command
		var ui = require("./ui");
		ui(function(complete) {
			start(complete);
		});
	} else {
			var opt = argv._[0];
			if (opt == "info") {
				start({});
				return;
			}

			// Some command
			// Load preset
			var preset = presets.get(opt);
			if (preset == null) {
				console.log(chalk.red("Preset '" + opt + "' not found."));
				console.log("Try: " + presets.getKeys().join(", "));
			} else {
				// Got a valid preset
				start(preset);
			}
	}	
}

function start(p) {
	// Copy base config to preset if not present
	_.forIn(config.data, function(v,k) {
		if (typeof(p[k]) == 'undefined') {
			p[k] = config.data[k];
		}
	})

	// Copy overrides from command line to active preset
	_.forIn(p, function(v,k) {
		if (typeof(argv[k]) !== 'undefined') {
			p[k] = argv[k];
		}
	})

	// Validate existence of samples directory
	var relBasePath = p.samples;
	try {
		var absBasePath = fs.realpathSync(p.samples);
		if (!fs.existsSync(absBasePath)) {
			util.loge("Sample path does not exist: " + relBasePath);
			return;
		}	
	} catch (e) {
		showError({
			raw: e.toString(),
			msg: "Could not resolve path '" +  relBasePath + "'"
		});
		return;
	}

	var contents = fs.readdirSync(absBasePath);

	async.forEachSeries(
	  contents, 
	  // Process sub-directories
	  function(item, callback) {
	  	var fullPath = absBasePath + path.sep +  item;
	   	if (fs.lstatSync(fullPath).isDirectory()) {
	   		preset = _.clone(p, true);
	   		
	   		// Output individual samples to subdirectories
	   		if (preset.outputPath && typeof(preset.sliceLength) == 'undefined') {
	   			if (strings.endsWith(preset.outputPath, "/")) {
	   				preset.outputPath += item + "/";
	   			}
	   		}

				processDirectory(fullPath, preset, callback);
	    } else callback();
	  }, 
	  function(err){
	    if (err) {
	      return showError(err);
	    }
	    // Process parent
	    processDirectory(absBasePath, _.clone(p, true), function(err) {
	    	if (err) showError(err);
	    	else {
	    		console.log(chalk.yellow("\nAll done."));
	    	}
	    })
	  }
	);
}

function processDirectory(absBasePath, preset, completion) {
	console.log("Processing: " + absBasePath);
	preset.absBasePath = absBasePath;
	handleDirectory(absBasePath, function(err, set) {
		if (err) return completion(err);
		if (set.meta.length == 0) return completion();
		if (typeof preset["outputPath"] == 'undefined') {
			preset.outputPath = path.dirname(absBasePath);
		}

		preset.outputPath = path.resolve(preset.outputPath);

		mkdirp(preset.outputPath, function(err) {
			if (err) return completion(err);
			loadedSet(set, preset, function(err, result) {
				if (err) return completion(err);
				else completion();
			})
		});
	});
}
function showError(err) {
		if (err.msg) util.loge(err.msg);
		else util.loge(err);
		if (typeof(err.raw) !== "undefined")
			util.loge(err.raw);

		if (err.path) 		util.loge("Path:    " + err.path);
		if (err.fix) 			util.loge("Fix:     " +  err.fix);
		if (err.cmd) 			util.loge("Command: " +  err.cmd);
		if (err.options) 	util.loge("Options: " +  err.options);
		if (err.input) 		util.loge("Input:   " + err.input);
		if (err.output)	 	util.loge("Output:  " + err.output);
}

function loadedSet(set, preset, completion) {
	var op = null;
	if (preset.sliceLength) {
		op = require("./chain")
	} else if (argv._[0] == "info") {
		op = require("./info");
	} else {
		op  = require("./sample");
	}
	op.process(set, preset, completion);	
}

function handleDirectory(basePath, completion) {
	if (!strings.endsWith(basePath, "/") && !strings.endsWith(basePath, "\\")) 
			basePath += path.sep;

	var files = fs.readdirSync(basePath);
	var set = {};

	async.waterfall([
		function(callback) {
			// Filter out non sample-looking things
			var filteredFiles = files.filter(function(f) {
				return (strings.endsWith(f, ".aiff") || strings.endsWith(f, ".wav") || strings.endsWith(f, ".mp3"))
			})
			callback(null, filteredFiles);
		},
		function(filteredFiles, callback) {
			util.log("Extracting information for " + filteredFiles.length + " file(s)");
			if (filteredFiles.length == 0) return callback(null, []); // No files
			set.files = filteredFiles;
			engine.getMetadata(set.files, basePath, callback);
		}
	], function(err, results) {
		set.meta = results;
		completion(err, set);
	});
}


