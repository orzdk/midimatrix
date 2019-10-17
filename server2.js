const { isText, isBinary, getEncoding } = require('istextorbinary');
var fs = require("fs");
var serialport = require("serialport");
var portName = '/dev/ttyAMA0'; 
var readData = ''; 

var displayIDX = -1;
var sysexFileList = [];

var sysexBufferString;
var sysexBuffer;
var sysexBufferPacket;

const sysexFolder = "./sysex";

var bufHeadFileName = Buffer.from("F0", "hex");
var bufHeadSysex = Buffer.from("F1", "hex");
var bufTail = Buffer.from("FF", "hex");

String.prototype.replaceAll = function(search, replace) {
    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);

}

var sp = new serialport(portName, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false

});

sp.on('data', function (data) {

	var command = data.toString();

	if (command == 0x1) {
	
		if (++displayIDX > sysexFileList.length-1) displayIDX = 0;

		sysexBuffer = Buffer.from(sysexBufferString, "utf8");
		sysexBufferPacket = Buffer.concat([ bufHeadFileName, sysexBuffer, bufTail ]);
		sp.write(sysexBufferPacket);	

	}

	else if (command == 0x2) { 

		var filepath = sysexFolder + "/" + sysexFileList[displayIDX];
		var tf = isText(filepath);

		fs.readFile(filepath, function(err, buf) {

			if (tf){
				sysexBufferString = buf.toString().replaceAll(" ","");
				sysexBuffer = Buffer.from(sysexBufferString, "utf8");
			} else {
				sysexBuffer = Buffer.from(buf, "hex");
			}

			console.log(sysexBufferString);
			console.log(sysexBuffer);

			var sysexBufferPacket = Buffer.concat([ bufHeadSysex, sysexBuffer, bufTail ]);
			sp.write(sysexBufferPacket);
	 	
		});
	}

});

sp.on('close', function (err) {
	console.log('port closed');
});

sp.on('error', function (err) {
	console.error("error", err);
});

sp.on('open', function () {
	console.log('port opened...');
});

getFolderContents = function(){
	fs.readdir(sysexFolder, (err, files) => {
	  files.forEach(file => {
	    sysexFileList.push(file);
	  });
	});

}

getFolderContents();






