var express = require('express');
var bodyParser = require('body-parser');
var cors = require("cors");
var fs = require('fs');
const { exec } = require('child_process');
const { spawn }  = require("node-pty");
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')

var port = 7001;
var app = express(); 

app.use(express.static(__dirname));
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

var server = app.listen(port);
var socket = require("socket.io").listen(server);
var apiRoutes = express.Router(); 

var serialBuffer = [];
var serialPort = {};
var serialConnected = false;

var midiklikname = 'USB MIDIKliK 4x4';

var lineSwitchesTemplate = {
	0: {position:10, controller: "FILTER_CH"},
	1: {position:13, controller: "FILTER_SC"},
	2: {position:16, controller: "FILTER_RT"},
	3: {position:19, controller: "FILTER_SX"},
	4: {position:24, controller: "CABLE_IN_1"},
	5: {position:26, controller: "CABLE_IN_2"},
	6: {position:28, controller: "CABLE_IN_3"},
	7: {position:30, controller: "CABLE_IN_4"},
	8: {position:35, controller: "JACK_OUT_1"},
	9: {position:37, controller: "JACK_OUT_2"},
	10: {position:39, controller: "JACK_OUT_3"},
	11: {position:41, controller: "JACK_OUT_4"}
}



    var ConvertBase = function (num) {
        return {
            from : function (baseFrom) {
                return {
                    to : function (baseTo) {
                        return parseInt(num, baseFrom).toString(baseTo);
                    }
                };
            }
        };
    };
        
    // binary to decimal
    ConvertBase.bin2dec = function (num) {
        return ConvertBase(num).from(2).to(10);
    };
    
    // binary to hexadecimal
    ConvertBase.bin2hex = function (num) {
        return ConvertBase(num).from(2).to(16);
    };
    
    // decimal to binary
    ConvertBase.dec2bin = function (num) {
        return ConvertBase(num).from(10).to(2);
    };
    
    // decimal to hexadecimal
    ConvertBase.dec2hex = function (num) {
        return ConvertBase(num).from(10).to(16);
    };
    
    // hexadecimal to binary
    ConvertBase.hex2bin = function (num) {
        return ConvertBase(num).from(16).to(2);
    };
    
    // hexadecimal to decimal
    ConvertBase.hex2dec = function (num) {
        return ConvertBase(num).from(16).to(10);
    };
    
    this.ConvertBase = ConvertBase;
    


var pyLumaThingy = (bitMap) => {

	var t = `
import time
from demo_opts import get_device
from luma.core.render import canvas
from luma.core import legacy

def main():
    MY_CUSTOM_BITMAP_FONT = [
        [
            ${ bitMap } 
        ]
    ]

    device = get_device()
    with canvas(device) as draw:
        legacy.text(draw, (0, 0), "\\0", fill="white", font=MY_CUSTOM_BITMAP_FONT)

    time.sleep(5)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
	`

	return t;
}




//console.log(ledPyCode);

String.prototype.replaceAll = function(search, replace) {

    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);

}

var switchValue = (s) => s == "X" ? 1 : s == "." ? 0 : null;

var executeShellCommand = (cmd, callback) => {
	exec(cmd, function(err, stdout, stderr){
    	callback({stdout: stdout, stderr: stderr});
	});
}

/* LED Stuff */

var sendPython = (pycode) => {

	a = spawn('python', ["-c",pycode, "--interface", "spi", "--width", 8, "--height", 8, "--display", "max7219"] );

	a.on("data", function(m){
		console.log(m);
	});

}

/*            */

var sendSysEx = (midiklikalsaid,sysEx,callback) => {

	var cmd = 'send_midi ' + midiklikalsaid + ':0 SYSEX,' + sysEx.toString().replaceAll(" ",",");
	console.log(cmd);
	executeShellCommand(cmd, function(rply){
		setTimeout(() => {
			callback();
		},2000);
	});	
}

var midiKlikAlsaID = (callback) => {
	var rv = false;
	executeShellCommand('sudo aconnect -l', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf(midiklikname) > -1 && lines[c].indexOf("type=kernel") > -1){
				rv = lines[c].split(":")[0].split(" ")[1];
				break;
			}
		}
		callback(rv);
	});
}

var midiKlikDeviceID = (callback) => {
	executeShellCommand('lsusb', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf("1eaf") > -1){
				callback(lines[c].split(" ")[3].substring(0,3));
				break;
			}
		}
	});
}

var isSerialPortAvailable = (callback) => {
	executeShellCommand('ls /dev/ttyACM0', function(reply){
		callback(reply.stdout.indexOf('/dev/ttyACM0') > -1);
	});	
}

var processRoutingTable = (configLineArray, callback) => {

	var routingTable = [];

	for (var lineNum=0; lineNum<configLineArray.length; lineNum++){

		textLine = configLineArray[lineNum];

		if(textLine.indexOf("->") > -1){
			var lineSwitches = JSON.parse(JSON.stringify(lineSwitchesTemplate));

			var routingTableLine = [];

			for (var i=0;i<12;i++){
				switchPos = lineSwitches[i].position;
				routingTableLine.push(switchValue(textLine.substring(switchPos,switchPos+1)));
			}

			routingTable.push(routingTableLine);
		}
	}

	callback(routingTable);
}

var sendSysEx = (midiklikalsaid,sysEx,callback) => {

	var cmd = 'send_midi ' + midiklikalsaid + ':0 SYSEX,' + sysEx.toString().replaceAll(" ",",");
	console.log(cmd);
	executeShellCommand(cmd, function(rply){
		setTimeout(() => {
			callback();
		},2000);
	});	
}

var bootMidiKlikSerialMode = (midiklikalsaid, callback) => {

	sendSysEx(midiklikalsaid, "F0 77 77 78 08 F7", () => {
		setTimeout(() => {
			callback();
		},2000);

	});
}

pad = (padThis) => {
	return padThis.length == 1 ? "0" + padThis : padThis;
}

createLEDCode = (routeTable) => {

	//console.log(routeTable);
    var t = "";
 
	for (row=0;row<8;row++){
		r = "";
		for (col=4;col<12;col++){
			r+=routeTable[row][col];    
		}

		t+= " " + "0x" + pad(ConvertBase.bin2hex(r).toString().toUpperCase());
	}

	console.log(t);

 	var pyCode = pyLumaThingy(t.trim().split(" ").join(","));
	sendPython(pyCode);
}

var onSerial = (serialData) => {

	line = serialData.toString();
	serialBuffer.push(line);		  

	if (line.indexOf("6.USB product string") > -1){
		processRoutingTable(serialBuffer, (routeTable) => {
			
			createLEDCode(routeTable);

	  		socket.sockets.emit("midiklik_obj", JSON.stringify({routeTable}));		
  			serialBuffer = [];
			serialData = "";
	  	});
	}
}

var connectSerial = (delay, callback) => {
	serialBuffer = [];
	serialData = "";

	serialPort = new SerialPort("/dev/ttyACM0", {
	    baudRate : 115200,
	    dataBits : 8,
	    parity : 'none',
	    stopBits: 1,
	    flowControl : false
	}); 

	const lineStream = serialPort.pipe(new Readline("\r\n"));
	lineStream.on('data', onSerial)
	serialConnected = true;

	if (callback){
 		setTimeout(()=>{
			callback();
		},delay);	
	}
}

apiRoutes.post('/getRoutingInfo', (req, res) => {	

	socket.sockets.emit("midiklik", "Please wait for isSerialPortAvailable()\n");
	isSerialPortAvailable((serialAvailable) => {

		if(serialAvailable == true){
			if(serialConnected == true){
				serialPort.write("0");
			} else {
				socket.sockets.emit("midiklik", "Please wait for ConnectSerial()\n");
				connectSerial(2000,()=>{
					serialPort.write("0");
				});
			}
		} else {
			midiKlikAlsaID((midiklikalsaid) => {
				if (midiklikalsaid != false){
					socket.sockets.emit("midiklik", "Please wait for bootMidiKlikSerialMode()\n");
					bootMidiKlikSerialMode(midiklikalsaid, () => {
						socket.sockets.emit("midiklik", "Please wait for ConnectSerial()\n");
						connectSerial(2000,()=>{
							serialPort.write("0");
						});			
					});
				};
			});
		}

	});

	res.sendStatus(200);
	
});

apiRoutes.post('/resetMidiKlik', (req, res) => {	
 
 	socket.sockets.emit("midiklik", "Please wait for midiKlikAlsaID()\n");
	midiKlikAlsaID(midiklikalsaid => {
 	
 		socket.sockets.emit("midiklik", "Please wait for isSerialPortAvailable()\n");
		isSerialPortAvailable(serialAvailable => {

			if (serialAvailable == true){

				if (serialConnected == true){
					serialPort.write("s");
					socket.sockets.emit("midiklik", "Reset\n");	
				} else {
					connectSerial(()=>{
						setTimeout(()=>{
							serialPort.write("s");
							socket.sockets.emit("midiklik", "Connected and reset\n");	
						},1000);
						
					});
				}

			} else {
				socket.sockets.emit("midiklik", "Midiklik is not in serial mode\n");
			}

		});

	});
	
	res.sendStatus(200);

});

apiRoutes.post('/sendsysex', (req, res) => {	

	/* Her skal først slås tilbage til MidiMode !!!! */

 	socket.sockets.emit("midiklik", "Please wait for midiKlikAlsaID()\n");
	midiKlikAlsaID(midiklikalsaid => {

	 	socket.sockets.emit("midiklik", "Please wait for sendSysEx()\n");
		sendSysEx(midiklikalsaid, req.body.sysex, () => {
			res.sendStatus(200);
		});
	});
	
});

apiRoutes.post('/ledmatrixcommand', (req, res) => {	

	/* Her skal først slås tilbage til MidiMode !!!! */

 	var pyCode = pyLumaThingy(req.body.lumacodes);
	sendPython(pyCode);
	res.sendStatus(200);
	
});

app.use('/api', apiRoutes);



