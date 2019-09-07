var express = require('express');
var bodyParser = require('body-parser');
const { exec } = require('child_process');
const { spawn }  = require("node-pty");
var cors = require("cors");

port = 7000;

var app = express(); 

app.use(express.static(__dirname));
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

var server = app.listen(port);
var socket = require("socket.io").listen(server);
var apiRoutes = express.Router(); 

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const Delimiter = require('@serialport/parser-delimiter')
const ByteLength = require('@serialport/parser-byte-length')
var serialPort;
var parser;

//var parser = new Readline({ delimiter: '\r\n' });

var midiklikname = 'USB MIDIKliK 4x4';

executeShellCommand = (cmd, callback) => {
	exec(cmd, function(err, stdout, stderr){
    	callback({stdout: stdout, stderr: stderr});
	});
}

var getMidiKlikID = (callback) => {
	executeShellCommand('sudo aconnect -l', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf(midiklikname) > -1 && lines[c].indexOf("type=kernel") > -1){
				callback(lines[c].split(":")[0].split(" ")[1]);
			}
		}
	});
}

var bootMidiKlikSerialMode = (callback) => {
	getMidiKlikID((midiklikid)=>{
		var cmd = 'send_midi ' + midiklikid + ':0 SYSEX,F0,77,77,78,08,F7';
		executeShellCommand(cmd, function(){
			callback();
		});	
	});
}

var resetMidiKlik = (res) => {
	var cmd1 = 'sudo /home/pi/midimatrix/tools/usbreset /dev/bus/usb/001/002';
	executeShellCommand(cmd1, function(shellReply){
		console.log("ok");
		if (res) res.sendStatus(200);
	});
}

var linenum = 0;
var port;

socket.on("connection", (client) => {

	var connectSerial = () => {


		port = new SerialPort("/dev/ttyACM0", {
		    baudRate : 115200,
		    dataBits : 8,
		    parity : 'none',
		    stopBits: 1,
		    flowControl : false
		}); 

		port.on('open', function() {
		   console.log("port open");
		})

		const lineStream = port.pipe(new Readline("\r\n"));

		lineStream.on('data', function (j) {
		  console.log('Data:', j.toString());
		  socket.sockets.emit("midiklik", j.toString());
		})

	}

	apiRoutes.post('/resetmidiklik', function(req, res){	
		resetMidiKlik(res);
	});

	apiRoutes.post('/menuchoose', (req, res)=>{	
		port.write("0");
		res.sendStatus(200);
	});

	apiRoutes.post('/bootmidiklikserialmode', (req, res)=>{	
		bootMidiKlikSerialMode(()=>{
			setTimeout(()=>{
				connectSerial();
				res.sendStatus(200);		
			},2000);	
		});
	});

	apiRoutes.post('/bootonly', (req, res)=>{	
		bootMidiKlikSerialMode(()=>{
			res.sendStatus(200);		
		});
	});


	app.use('/api', apiRoutes);

});

resetMidiKlik();