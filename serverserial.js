
var express = require('express');
var bodyParser = require('body-parser');
var cors = require("cors");
var fs = require('fs');
const { exec } = require('child_process');
const { spawn }  = require("node-pty");
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')

var baseConvert = require('./js/baseconverter.js');
var pyluma = require('./js/pyluma.js');
var midiklik = require('./js/midiklik.js');

var emitter = require('emitter').EventEmitter;

let em = new emitter();

MidiKlik = new midiklik.MidiKlik();

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

var midiklikName = 'USB MIDIKliK 4x4';
var currentRoutes = {}

var debug = true;

String.prototype.replaceAll = function(search, replace) {
    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);
}

var pad = (padThis) => { return padThis.length == 1 ? "0" + padThis : padThis; }

var dbg = (msg) => { 
	if (debug==true) {
		socket.sockets.emit("midiklik_message", msg + "\n"); 
	}
}

var shell = (cmd, callback) => {
	exec(cmd, function(err, stdout, stderr){
    	callback({stdout: stdout, stderr: stderr});
	});
}

var shellPython = (pycode) => {
	a = spawn('python', ["-c", pycode, "--interface", "spi", "--width", 8, "--height", 8, "--display", "max7219"] );

	a.on("data", function(m){ });
}

var alsaID = (name, callback) => {
	
	dbg("alsaID()");

	var rv = false;
	shell('sudo aconnect -l', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf(name) > -1 && lines[c].indexOf("type=kernel") > -1){
				rv = lines[c].split(":")[0].split(" ")[1];
				break;
			}
		}
		callback(rv);
	});
}

var createLEDCommand = (routeTable) => {

	ledCommand = routeTable.map((row, i, a) =>{
		return  "0x" + pad(baseConvert.bin2hex(row.join("")).toString().toUpperCase()); 
	}).join(", ");
 	
 	return ledCommand;
}

var sendSysEx = (alsaport,sysEx, cbdelay, callback) => {
	dbg("sendSysEx()");

	var cmd = 'send_midi ' + alsaport + ':0 SYSEX,' + sysEx.toString().replaceAll(" ",",");
	shell(cmd, function(){
		setTimeout(() => {
			callback();
		},cbdelay);
	});	
}

var bootMidiKlikSerialMode = (midiklikalsaid, cbdelay, callback) => {

	dbg("bootMidiKlikSerialMode()");

	sendSysEx(midiklikalsaid, "F0 77 77 78 08 F7", 2000, () => {
		setTimeout(() => {
			callback();
		},cbdelay);

	});
}

var lightUp = () => {

	shellPython(pyluma.pyLuma(createLEDCommand(currentRoutes.routes)));
}

var lightDown = () => {	
	
	var off = [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]
	shellPython(pyluma.pyLuma(off));
}

apiRoutes.post('/sendsysex', (req, res) => {	

	alsaID(midiklikName, midiklikalsaid => {
		if (midiklikalsaid != false)
		sendSysEx(midiklikalsaid, req.body.sysex, 2000, () => {
			res.sendStatus(200);
		});
	});
	
});

apiRoutes.post('/getRoutingInfo', (req, res) => {	
	
	if(currentRoutes && currentRoutes.routes && Object.keys(currentRoutes.routes).length > 0){
		socket.sockets.emit("midiklik_routes", routes );	 
		res.sendStatus(200);	

	} else {
		alsaID(midiklikName, (midiklikalsaid) => {
			if (midiklikalsaid != false){

				bootMidiKlikSerialMode(midiklikalsaid, 2000, () => {
					
					MidiKlik.connectSerial();
		
					MidiKlik.on('routes', (routes) => {
					    socket.sockets.emit("midiklik_routes", routes);	 
					});

				});
			};
		});

		res.sendStatus(200);	
	}

});

apiRoutes.post('/backtomidimode', (req, res) => {	

	MidiKlik.connectSerial("midimode");

	res.sendStatus(200);	
	
});

apiRoutes.post('/sendserialchar', (req, res) => {	

	if (Object.keys(serialPort).length > 0){
		serialPort.write(req.body.char);
		res.sendStatus(200);
	} else {
		res.sendStatus(404);
	}
	
});

apiRoutes.post('/lightup', (req, res) => {	

	lightUp();

	res.sendStatus(200);	
	
});

apiRoutes.post('/lightdown', (req, res) => {	

	lightDown();

	res.sendStatus(200);	
	
});

app.use('/api', apiRoutes);



