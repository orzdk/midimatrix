var express = require('express');
var bodyParser = require('body-parser');
var cors = require("cors");
var fs = require('fs');
const { exec } = require('child_process');
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

var currentFunction = "";
var serialBuffer = [];
var serialPort = {};
var midiklikname = 'USB MIDIKliK 4x4';
var routeInfoObjGlob = {};

var lineSwitchesTemplate = {
	0:  { pos:10, controller: "FILTER_CH"  },
	1:  { pos:13, controller: "FILTER_SC"  },
	2:  { pos:16, controller: "FILTER_RT"  },
	3:  { pos:19, controller: "FILTER_SX"  },
	4:  { pos:24, controller: "CABLE_IN_1" },
	5:  { pos:26, controller: "CABLE_IN_2" },
	6:  { pos:28, controller: "CABLE_IN_3" },
	7:  { pos:30, controller: "CABLE_IN_4" },
	8:  { pos:35, controller: "JACK_OUT_1" },
	9:  { pos:37, controller: "JACK_OUT_2" },
	10: { pos:39, controller: "JACK_OUT_3" },
	11: { pos:41, controller: "JACK_OUT_4" }
}

var switchValue = (s) => s == "X" ? true : s == "." ? false : null;

var executeShellCommand = (cmd, callback) => {
	exec(cmd, function(err, stdout, stderr){
    	callback({stdout: stdout, stderr: stderr});
	});
}

var midiKlikAlsaID = (callback) => {
	executeShellCommand('sudo aconnect -l', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf(midiklikname) > -1 && lines[c].indexOf("type=kernel") > -1){
				callback(lines[c].split(":")[0].split(" ")[1]);
			}
		}
	});
}

var midiKlikDeviceID = (callback) => {
	executeShellCommand('lsusb', function(data){
		var lines = data.stdout.split('\n');
		for (var c=0; c<lines.length; c++){
			if (lines[c].indexOf("1eaf") > -1){
				callback(lines[c].split(" ")[3].substring(0,3));
			}
		}
	});
}

var bootMidiKlikSerialMode = (callback) => {
	midiKlikAlsaID((midiklikalsaid)=>{
		var cmd = 'send_midi ' + midiklikalsaid + ':0 SYSEX,F0,77,77,78,08,F7';
		executeShellCommand(cmd, function(){
			callback();
		});	
	});
}

var resetMidiKlik = (callback) => {
	midiKlikDeviceID(id=>{
		var cmd1 = 'sudo /home/pi/midimatrix/tools/usbreset /dev/bus/usb/001/' + id;
		executeShellCommand(cmd1, function(shellReply){
			callback();
		});
	});
}

var processRoutingTable = function(configLineArray, callback){

	var optionLineSequence = 0;
	var routeInfoObj = {}

	var attachInfoTo = null;

	for (var configLine=0; configLine<configLineArray.length; configLine++){

		line = configLineArray[configLine];
		cableIndex = Number(line.substring(3,4))-1;

		if(line.indexOf("->") > -1){

			var lineSwitches = JSON.parse(JSON.stringify(lineSwitchesTemplate));

			for (var i=0;i<12;i++){
				lineSwitches[i].optionValue = switchValue(line.substring(lineSwitches[i].pos,lineSwitches[i].pos+1));
			}

			routeInfoObj[optionLineSequence] = lineSwitches;

			if (optionLineSequence-1 < 4){
				routeInfoObj[optionLineSequence]["optionInfo"] = { group: "CABLE_OUT", cableIndex }
			} else if (optionLineSequence >= 4 && optionLineSequence < 8 ){
				routeInfoObj[optionLineSequence]["optionInfo"]= { group: "JACK_IN", cableIndex }
			} else {
				routeInfoObj[optionLineSequence]["optionInfo"] = { group: "JACK_IN_THRU", cableIndex }
			}

			optionLineSequence++;
		}
	
	}

	callback(routeInfoObj);
}

var createSysExMessage = (action, sourcetype, id, filtermask, targets) =>{

	var sysExStart = "F0 77 77 78 0F";
	var sysExEnd = "F7";
	var sysEx;
	var sourceType;

	if (action="reset"){
		sysex = sysExStart + "00" + sysExEnd;
	} else {
		sourceType = sourcetype == "cable" ? "00" : "01";
	}
}

socket.on("connection", (client) => {

	var connectSerial = () => {

		serialPort = new SerialPort("/dev/ttyACM0", {
		    baudRate : 115200,
		    dataBits : 8,
		    parity : 'none',
		    stopBits: 1,
		    flowControl : false
		}); 
	
		const lineStream = serialPort.pipe(new Readline("\r\n"));
	
		lineStream.on('data', function (j) {

		  line = j.toString();
		  serialBuffer.push(line);		  
	
		  if (line.indexOf("6.USB product string") > -1){
		  	if (currentFunction == "CURRENT_SETTINGS"){
		  		processRoutingTable(serialBuffer, routeInfoObj => {
		  			routeInfoObjGlob = routeInfoObj;
		  			socket.sockets.emit("midiklik", JSON.stringify(routeInfoObj));
		  		});
		  		currentFunction = "";
		  	} 
		  }
		  
		})

	}

	apiRoutes.post('/getconfig', (req, res) => {	
		console.log("hest",routeInfoObjGlob);
		res.json({routes: routeInfoObjGlob});
	});

	apiRoutes.post('/resetmidiklik', (req, res) => {	
		resetMidiKlik(()=>{
			res.sendStatus(200);
		});
	});

	apiRoutes.post('/menuchoose', (req, res) => {	
		currentFunction = "CURRENT_SETTINGS";
		serialPort.write("0");		
		res.sendStatus(200);
	});

	apiRoutes.post('/bootserialmode', (req, res) =>{	
		bootMidiKlikSerialMode(()=>{
			res.sendStatus(200);		
		});
	});

	apiRoutes.post('/bootconnectserialmode', (req, res) => {	
		bootMidiKlikSerialMode(()=>{
			setTimeout(()=>{
				connectSerial();
				res.sendStatus(200);		
			},2000);	
		});
	});
	
	app.use('/api', apiRoutes);

});

