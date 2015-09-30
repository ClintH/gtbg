var colors = require("colors/safe");

module.exports = {

log:function(m) {
	console.log(" " + m);
},

logg:function(m) {
	console.log("   " + m);
},

loge:function(m) {
	console.log(colors.red("Error: ")  + m);
},

getOutputParams: function(opts) {
	var humanOut = "";
	var outFormat = "--bits " + opts.get("bitDepth") +" ";
	var sox = "rate " + opts.get("sampleRate") +" "
	humanOut = opts.get("bitDepth") +"@" + opts.get("sampleRate");
	if (opts.get("autoGain")) {
		sox += "gain -nh";
		humanOut +=". Autogain";
	}

	return {
		human: humanOut,
		sox: sox,
		format: outFormat
	}
}
}