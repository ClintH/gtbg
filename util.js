var chalk = require("chalk"),
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


}