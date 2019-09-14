const { spawn }  = require("node-pty");
var pyluma = require('./pylumascript.js');
var baseConvert = require('./baseconverter.js');

const LedWrapper = class {

	constructor() {
	}

	pad(padThis){ return padThis.length == 1 ? "0" + padThis : padThis; }

	shellPython(ledBitmap){
		let pyCmd = spawn('python', ["-c", ledBitmap, "--interface", "spi", "--width", 8, "--height", 8, "--display", "max7219"] );

		pyCmd.on("data", function(m){ 

		});
	}

	createLEDCommand(routeTable){

		let ledCommand = routeTable.map((row, i, a) =>{
			return  "0x" + this.pad(baseConvert.bin2hex(row.join("")).toString()); 
		}).join(", ");
	 	
	 	return ledCommand;
	}

	lightUp(routes){

		this.shellPython(pyluma.pyLuma(this.createLEDCommand(routes)));
	}

	lightDown(){	
		
		var off = [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]
		this.shellPython(pyluma.pyLuma(off));
	}

	light_M(){	
		
		var off = [0xff, 0x01, 0x0e, 0x18, 0x18, 0x0e, 0x01, 0xff]
		this.shellPython(pyluma.pyLuma(off));
	}

	light_S(){	
		
		var off = [0x8c, 0x9b, 0x9b, 0x99, 0x99, 0x91, 0x73, 0x62]
		this.shellPython(pyluma.pyLuma(off));
	}


}

module.exports = LedWrapper;