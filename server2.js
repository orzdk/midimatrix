var fs = require("fs");
const { isText, isBinary, getEncoding } = require('istextorbinary')

var serialport = require("serialport");
var portName = '/dev/ttyAMA0'; 
var readData = ''; 

String.prototype.replaceAll = function(search, replace) {
    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);
}

// var sp = new serialport(portName, {
//   baudRate: 9600,
//   dataBits: 8,
//   parity: 'none',
//   stopBits: 1,
//   flowControl: false
// });

// sp.on('data', function (data) {
// 	var index = data.toString();
// 	console.log(data.toString());
// });

// sp.on('close', function (err) {
// 	console.log('port closed');
// });

// sp.on('error', function (err) {
// 	console.error("error", err);
// });

// sp.on('open', function () {
// 	console.log('port opened...');
// });

writeSerial_CHAR = function(port, char, wait){
	setTimeout(()=>{
	  sp.write(char);
	},wait);
}

//filename = "./sysex/2.syx";
filename = "./sysex/1.txt";

var tf = isText(filename);
var bufstr;

fs.readFile(filename, function(err, buf) {
	bufstr = buf.toString().replaceAll(" ","");

	if (tf){
		bufstr = buf.toString().replaceAll(" ","");
	} else {
		bufstr = buf;
	}

	bufff = Buffer.from(bufstr, "hex");
	console.log(bufff);
 	
});




