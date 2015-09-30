"use strict";
var inquirer = require("inquirer"),
	fs = require("fs"),
	async = require("async"),
	util = require("util"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	nconf = require("nconf"),
	args = require("optimist").argv,
	colors = require("colors/safe"),
	_ = require("lodash"),
	strings = require("./strings"),
	util = require("./util"),
	engine = require("./engine")
	;

console.log(colors.inverse("gtbg"));

nconf.argv()
	.env()
  .file({ file: 'config.json' });

if (args._.length == 0 || args._[0] == "help") {
	util.log("Usage:");
	util.log(" node app info: Display info on samples");
	util.log("         chain: Create sample chains for the Octatrack");
	util.log("     chainRytm: Create sample chains for the Rytm");
	util.log("            ot: Process samples for Octatrack");
	util.log("            md: Process for Machinedrum");
	util.log("\nFor additional info and options, please see README.md");

}

// First validate existence of samples directory
var relBasePath = nconf.get("samples");
try {
	var absBasePath = fs.realpathSync(nconf.get("samples"));
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
  	var p = absBasePath + path.sep +  item;
   	if (fs.lstatSync(p).isDirectory()) {
  		processDirectory(p, nconf, callback);
    } else callback();

  }, 
  function(err){
    if (err) {
      return showError(err);
    }
    // Process parent
    processDirectory(absBasePath, nconf, function(err) {
    	if (err) showError(err);
    	else util.log("All done.");
    })
  }
);
function processDirectory(absBasePath, nconf, completion) {
	nconf.set("absBasePath", absBasePath);
	handleDirectory(absBasePath, nconf, function(err, set) {
		if (err) return completion(err);
		if (set.meta.length == 0) return completion();

		nconf.defaults({outputPath:path.dirname(absBasePath)});
		var p = path.resolve(nconf.get("outputPath"));
		nconf.set("outputPath", p);

		mkdirp(p, function(err) {
			if (err) return completion(err);
			loadedSet(set, function(err, result) {
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

function loadedSet(set, completion) {
	var op = null;
	// Get command-level options
	var opts = nconf.get(args._[0]);
	// Copy options to top-level if they aren't
	// already set (ie via command line params)
	_.forIn(opts, function(value, key) {
		if (typeof(nconf.get(key)) == "undefined") 
			nconf.set(key, value);
	});

	switch (args._[0]) {
	case "chain":
		op = require("./chain");
		break;		
	case "chainRytm":
		op = require("./chain");
		break;
	case "info":
		op = require("./info");
		break;
	default:
		if (nconf.get(args._[0])) {
			op = require("./sample");
		}
	}
	if (op == null) {
		completion({
				msg:"Unknown command '" + args._[0] + "'",
				fix:"Try 'info', 'chain', 'md' or 'ot'	."
		});		
	} else {
		op.process(set, nconf, completion);
	}
}

function handleDirectory(basePath, nconf, completion) {
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
			if (filteredFiles.length == 0) {
				return callback(null, []);
			}
			set.files = filteredFiles;
			engine.getMetadata(set.files, basePath, nconf, callback);
		}
	], function(err, results) {
		set.meta = results;
		completion(err, set);
	});
}


