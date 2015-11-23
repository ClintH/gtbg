var chalk = require("chalk"),
  _ = require("lodash"),
  fs = require("fs");

module.exports = {

fileExists:function(v) {
  try {
    var s = fs.statSync(v);
    if (!s.isFile()) return "Not a valid path";
  } catch (e) {
    if (e.code =="ENOENT") {
      return "Path does not exist";
    }
    return "Error " + e.message;
  }
  return null; 
},
log:function(m) {
	console.log(" " + m);
},

logg:function(m) {
	console.log("   " + m);
},

loge:function(m) {
	console.log(chalk.red("Error: ")  + m);
},
layerOnData: function(f, existing) {
  var exists = this.fileExists(f);
  if (exists !== null) return exists;
  var str = fs.readFileSync(f);
  var o = null;
  try {
    o = JSON.parse(str);
    _.merge(existing, o);
  }
  catch (err) {
    return err;
  }
  return null;
}

}