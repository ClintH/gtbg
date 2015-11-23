var sox =require("./sox");
if (!sox.exists()) {
  sox.install();
} else {
  console.log("Installed");
}
