
var express = require('express');
var http = require("http");
var fs = require("fs");
var bodyParser = require('body-parser');
var fileUpload  = require('express-fileupload');
var async = require('async');
const { exec } = require('child_process');
const { spawn }  = require("node-pty");

port = 8000;

var app = express(); 

app.use(express.static(__dirname));
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({extended: true}));    

app.use(fileUpload());

var server = app.listen(port);
var socket = require("socket.io").listen(server);
var apiRoutes = express.Router(); 
var socketRoutes = express.Router(); 

var operationTimeout = 2150;
var running_scripts =  [];

console.log("MidiMatrix & socket.io @ http://localhost:" + port + ", CTRL + C to shutdown");

String.prototype.replaceAll = function(search, replace) {

    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);

}

Array.prototype.remove = function() {

    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;

};

socket.on("connection", function (client) {
	
	/* Shell */

	callHome = function(m){

		socket.sockets.emit("printer", m);

	}

	spawnShellCommand = function(cmd, callback){

		a = spawn('python', ["-u",cmd] );

		a.on("data", function(m){
			callHome(m);
		});

		callback(a);

	}

	executeShellCommand = function(cmd, callback){

		var a = exec(cmd, function(err, stdout, stderr){

			reply = {
				stdout: stdout, 
				stderr: stderr
			}

	    	callback(reply);

		});

	}

	parseConnectionList = function(data, data2, callback){

		var connections = [];
		var clientNames = [];
		var alsaClientNames = [];		
		var connectionsObj = {};
		var midiinfoobj = {};		
		var alsaClients = {};
		var line = "";
		var clientID = "";
		var clientName = "";
		var clientPortNum = "";
		var clientConnectionID = "";
		var alsaClientID = "";
		var alsaClientName = "";
		var alsaClientNameID = "";
		var clientFound = false;	
		var currentdevice = undefined;
		var alsaClientLineFound = false;
		var lines = data.stdout.split('\n');
		var lines2 = data2.stdout.split('\n');

		function getIO(alsaDeviceName){

			if (alsaDeviceName.indexOf("out_") > -1) {
				return "O";
			}
			else if (alsaDeviceName.indexOf("in_") > -1) {
				return "I";
			}
			else {

				for (var c=0; c<lines2.length; c++){
					line = lines2[c];
					if (line.indexOf(alsaDeviceName) > -1){
						return line.split("  ")[0];
					}
				}
			}

		}

		function countIdenticals(lf){

			var i = 0;

	    	Object.keys(midiinfoobj).forEach(function(a,b) {
	    		if (midiinfoobj[a].alsaDeviceNameID == lf) i++;
			});

	    	return i;
		
		}

		function rename(lf){

			var i = 1;

	    	Object.keys(midiinfoobj).forEach(function(a,b) {
	    		if (midiinfoobj[a].alsaDeviceOriginalName == lf) {
	    			midiinfoobj[a].alsaDeviceNameID = midiinfoobj[a].alsaDeviceNameID + " (" + i + ")";
	    			i++;
	    		}
			});

		}

		for (var c=0; c<lines.length; c++){

			line = lines[c];

			if (line.indexOf("Connected From") == -1 && line != "") {

				if (line.indexOf("[type=kernel,card=") > -1 || line.indexOf("[type=user,pid=") > -1){

					alsaClientID = line.split(":")[0].substring(7,line.split(":")[0].length);
					alsaClientPID = line.indexOf("pid") > 1 ? line.split("[")[1].split(",")[1].split("=")[1].replace("]","") : 0;
					alsaClientName = line.split("'")[1];
					alsaClientNameID = alsaClientName + "_" + alsaClientID;
					alsaClientIsFilter = line.indexOf("[type=user,pid=") > -1;

					alsaClients[alsaClientName] = alsaClientID;
					alsaClientLineFound = true;

				} else {

					if (line.indexOf("client") > -1){

						alsaClientLineFound = false;
			  			currentDevice = undefined;

					} 
					else {

						if (alsaClientLineFound == true){

							if (line.indexOf("Connecting To") > -1) { 

								connectingTo1 = line.split("To: ")[1].trim();

								if (connectingTo1.indexOf(",") > -1){

									connectingTo2 = connectingTo1.split(", ");
									for (i=0; i<connectingTo2.length; i++){ 
										currentDevice.connectingTo.push(connectingTo2[i].trim()); 
									};

								} else {
									currentDevice.connectingTo.push(connectingTo1); 
								}

							} 

							else {

								alsaDeviceNum = line.split("'")[0].trim();
								alsaDeviceName = line.split("'")[1].trim();

	                            alsaDeviceID = alsaClientID + ":" + alsaDeviceNum;

								midiinfoobj[alsaDeviceID] = { 
									
									alsaClientID: alsaClientID, 					/* 32					*/	
									alsaClientName: alsaClientName,					/* UM-ONE				*/
									alsaClientNameID: alsaClientNameID,				/* UM-ONE_32			*/								
									alsaClientPID: alsaClientPID, 					/* 28545				*/	
									alsaClientIsFilter: alsaClientIsFilter,			/* False / True			*/
																	
									alsaDeviceNum: alsaDeviceNum,					/* 0					*/																
									alsaDeviceID: alsaDeviceID, 					/* 32:0					*/
									alsaDeviceName: alsaDeviceName,					/* UM-ONE MIDI 1		*/
									alsaDeviceNameID: alsaDeviceName,				/* UM-ONE MIDI 1 (1)	*/														
									alsaDeviceOriginalName: alsaDeviceName,			/* UM-ONE MIDI 1		*/
									alsaDeviceIO: getIO(alsaDeviceName),

	 								connectingTo: [] 
								};

								if (countIdenticals(alsaDeviceName) > 1){
	                        		rename(alsaDeviceName);
	                        	}

								currentDevice = midiinfoobj[alsaDeviceID];

							}
						}
					}
				}
			}
		}

		Object.keys(midiinfoobj).forEach(function(a) {

		  var b = midiinfoobj[a];
		  
			for (var i=0; i < b.connectingTo.length; i++){

				point_to_id = b.connectingTo[i].trim();

				if (midiinfoobj[point_to_id]){

					from = midiinfoobj[a];
					to = midiinfoobj[point_to_id];

					connectionUID = from.alsaClientName.replaceAll(" ","_") + "~" + from.alsaDeviceNum + "+" + to.alsaClientName.replaceAll(" ","_") + "~" + to.alsaDeviceNum; 
					connectionUUID = from.alsaClientNameID.replaceAll(" ","_") + "~" + from.alsaDeviceNum + "+" + to.alsaClientNameID.replaceAll(" ","_") + "~" + to.alsaDeviceNum; 

					connections.push({connectionUID,from,to});
					connectionsObj[connectionUID] = {from,to}
					
				}	
			}

		});

		rv = { 
			alsaClients: alsaClients, 
			alsaDevices: midiinfoobj, 
			alsaDeviceConnections: connections,
			alsaDeviceConnectionsObj: connectionsObj
		}
		
		callback(rv);

	}

	/* Config Page */

	apiRoutes.post('/savescriptdefinitions', function(req, res){	
		
		fn = "/home/pi/midimatrix/scripts/index.json";
		fnc = JSON.stringify(req.body.scriptsDef, null, 2);

		fs.writeFile(fn,fnc, function(err, data) {
		  	if (err) console.log(err);
		  	res.sendStatus(200);
		});

	});

	apiRoutes.post('/loadscriptdefinitions', function(req, res){	
		
		fn = "/home/pi/midimatrix/scripts/index.json";
		fs.readFile(fn, function(err, buf) {
		  res.json(JSON.parse(buf.toString()));
		});

	});

	apiRoutes.post('/savescriptfile', function(req, res){	

		fn = '/home/pi/midimatrix/scripts/' + req.body.fileName + '.py';
		fnc = req.body.fileScript;

		fs.writeFile(fn,fnc, function(err, data) {
		  	res.sendStatus(200);
		});

	});

	apiRoutes.post('/loadunits', function(req, res){	
		
		fn = "/home/pi/midimatrix/scripts/indexunits.json";

		fs.readFile(fn, function(err, buf) {
		  res.json(JSON.parse(buf.toString()));
		});

	});

	/* Patch Files */

	apiRoutes.post('/savetranslations', function(req, res){	
		
		fn = "/home/pi/midimatrix/patches/translations.json";
		fnc = JSON.stringify(req.body.translations, null, 2);

		fs.writeFile(fn,fnc, function(err, data) {
		  	if (err) console.log(err);
		  	res.sendStatus(200);
		});

	});

	apiRoutes.post('/gettranslations', function(req, res){	

		fn = "/home/pi/midimatrix/patches/translations.json";
		fs.readFile(fn, function(err, buf) {
		  res.json(JSON.parse(buf.toString()));
		});

	});

	apiRoutes.post('/getrunningscripts', function(req, res){	

		var nameOnly = [];

		for (var i=0;i<running_scripts.length;i++){
			nameOnly.push(running_scripts[i].name);
		}
		
		res.json(nameOnly);

	});

	apiRoutes.post('/savepatch', function(req, res){	

		fn = '/home/pi/midimatrix/patches/' + req.body.filename + '.json';
		fnc = JSON.stringify(req.body.patch);
		
		fs.writeFile(fn, fnc, function(err, data) {
		  	if (err) console.log(err);

		  	fs.readdir('/home/pi/midimatrix/patches/', (err, files) => {
			  res.json(files);
			});

		});

	});

	apiRoutes.post('/loadpatch', function(req, res){	

		fn = '/home/pi/midimatrix/patches/' + req.body.filename;

		fs.readFile(fn, function(err, buf) {
		  res.json(JSON.parse(buf.toString()));
		});

	});

	apiRoutes.post('/loadunitcolors', function(req, res){	

		fn = '/home/pi/midimatrix/tools/unitcolors.json';

		fs.readFile(fn, function(err, buf) {
		  res.json(JSON.parse(buf.toString()));
		});

	});


	apiRoutes.post('/getpatchfilelist', function(req, res){	

		fs.readdir('/home/pi/midimatrix/patches/', (err, files) => {
		   res.json(files);
		});

	});

	apiRoutes.post('/deletepatchfile', function(req, res){	

		fn = '/home/pi/midimatrix/patches/' + req.body.filename.filename + ".json";
		fs.unlinkSync(fn);

		fs.readdir('/home/pi/midimatrix/patches/', (err, files) => {
			  res.json(files);
		});

	});


	/* App Settings Files */

	apiRoutes.post('/saveapptemp', function(req, res){	
		
		fn = "/home/pi/midimatrix/patches/TEMP.json";
		fnc = JSON.stringify(req.body.APP_SETTINGS, null, 2);

		fs.writeFile(fn,fnc, function(err, data) {
		  	if (err) console.log(err);
		  	res.sendStatus(200);
		});

	});

	apiRoutes.post('/loadapptemp', function(req, res){	
		
		fn = "/home/pi/midimatrix/patches/TEMP.json";

		fs.readFile(fn, function(err, buf) {
		  res.json(buf.toString());
		});

	});


	/* Operations  - Filterfiles */


	apiRoutes.post('/runfilesmart', function(req, res){	

		firstClients = [];

		callHome("Running: " + req.body.fileName);

		executeShellCommand('sudo aconnect -l', function(firstList){

			a  = firstList.stdout.split("\n");

			for (i=0;i<a.length;i++){
				if (a[i].indexOf("client") > -1 && a[i].indexOf("System") == -1 && a[i].indexOf("through") == -1){
					firstClients.push(a[i].split(":")[0].replace("client ",""));
				}
			}

			var runScriptCommand = "/home/pi/midimatrix/scripts/" + req.body.fileName + ".py";

			spawnShellCommand(runScriptCommand, function(runReply){
				setTimeout(function(){
					executeShellCommand('sudo aconnect -l', function(secondList){
						executeShellCommand('sudo amidi -l', function(thirdList){					
							parseConnectionList(secondList, thirdList, function(midiDevices){
							
								a = secondList.stdout.split("\n");

								rep = { newClient: -1 }

								for (i=0;i<a.length;i++){

									if (a[i].indexOf("client") > -1 && a[i].indexOf("System") == -1 && a[i].indexOf("through") == -1){

										newClient = a[i].split(":")[0].replace("client ","");

										if (!firstClients.includes(newClient) ) {
											rep = { newClient: newClient, newClientPID: runReply.pid,  midiDevices: midiDevices };
											running_scripts.push({pid: runReply.pid, name: req.body.fileName});
										}
									}

								}

								res.json(rep);

							});
						})
					});
				},operationTimeout);
			
			});
		});
	
	});

	apiRoutes.post('/stopfilterfile', function(req, res){	
		
		var toRemove;

		for (var i=0;i<running_scripts.length;i++){
			if (running_scripts[i].pid == req.body.pid){
				toRemove = i;
			}
		}		

		running_scripts.splice(toRemove,1);

		var cmd = "sudo kill -9 " + req.body.pid;
		executeShellCommand(cmd, function(shellReply){
			res.json(shellReply);
		});

	});


	/* Operations  - Connections */

	apiRoutes.post('/getdevices', function(req, res){	

		executeShellCommand('sudo aconnect -l', function(shellReply){
			executeShellCommand('sudo amidi -l', function(shellReply2){	

				parseConnectionList(shellReply, shellReply2, function(sp){
					res.json(sp);
				});

			});
		});
			
	});

	apiRoutes.post('/connectdevices', function(req, res){	

		var cmd = 'sudo aconnect ' + req.body.from + ' ' + req.body.to;

		executeShellCommand(cmd, function(shellReply){

			res.json(shellReply);
		});

	});

	apiRoutes.post('/disconnectdevices', function(req, res){	

		var cmd = 'sudo aconnect ' + req.body.from + ' ' + req.body.to + ' -d';

		executeShellCommand(cmd, function(shellReply){
			res.json(shellReply);
		});

	});

	apiRoutes.post('/clearallconnections', function(req, res){	

		var cmd1 = 'sudo aconnect -x';
		var cmd2 = "sudo pkill -9 python";

		executeShellCommand(cmd1, function(shellReply){
			executeShellCommand(cmd2, function(shellReply2){
				r = { r1: shellReply, r2: shellReply2 }
				res.json(r);
			});
		});

	});



	/* Operations  - Reset & Upload */

	apiRoutes.post('/hardreset', function(req, res){	

		var cmd1 = 'sudo /home/pi/midimatrix/tools/usbreset /dev/bus/usb/001/002';
		var cmd2 = "sudo pkill -9 python";

		running_scripts =  [];

		executeShellCommand(cmd1, function(shellReply){
			executeShellCommand(cmd2, function(shellReply2){
				res.json( {r1: shellReply, r2: shellReply2} );
			});
		});

	});

	apiRoutes.post('/gettemp', function(req, res){	

		var cmd1 = '/opt/vc/bin/vcgencmd measure_temp';

		running_scripts =  [];

		executeShellCommand(cmd1, function(shellReply){
			res.json( {r1: shellReply} );			
		});

	});

	apiRoutes.post('/softreset', function(req, res){	

		var cmd2 = "sudo pkill -9 python";

		running_scripts =  [];

		executeShellCommand(cmd2, function(shellReply2){
			res.json( { r2: shellReply2} );
		});

	});

	apiRoutes.post('/reboot', function(req, res){	

		var cmd = "sudo reboot now";

		executeShellCommand(cmd, function(shellReply){
			res.json(shellReply);
		});

	});

	apiRoutes.post('/shutdown', function(req, res){	

		var cmd = "sudo shutdown now";

		executeShellCommand(cmd, function(shellReply){
			res.json(shellReply);
		});

	});

	apiRoutes.post('/uploaddatatofile', function(req, res){	

		fileName = '/home/pi/midimatrix/scripts/' + req.body.fileName + '.py';
		fileText = req.body.fileText;

		var scriptMeta = { "title": req.body.fileName, "custom": true }

		fs.readFile('/home/pi/midimatrix/scripts/index.json', function(err, buf) {
			scriptsObj = JSON.parse(buf.toString());
			scriptsObj.push(scriptMeta);
			fs.writeFile('/home/pi/midimatrix/scripts/index.json', JSON.stringify(scriptsObj) , function(err, data) {
				console.log(err, data);
			});
		});

		fs.writeFile(fileName, fileText, function(err, data) {
		  	if (err) console.log(err);

		  	res.sendStatus(200);
		});

	});

	/* Operations - SendMidi */

	apiRoutes.post('/sendmidi', function(req, res){	
		
     	var cmd = "/home/pi/midimatrix/tools/sendmidi " + req.body.sendmidistring;
		executeShellCommand(cmd, function(shellReply){
			res.json({command: cmd, reply: shellReply});
		});

	});

	app.use('/api', apiRoutes);


	/* Operations  - Sockets & API */

	socketRoutes.post('/refresh', function(req, res){	
		socket.sockets.emit("usb-update");
		res.sendStatus(200);
	
	});

	socketRoutes.post('/gotonext', function(req, res){	
		socket.sockets.emit("goto-next");
		res.sendStatus(200);
	
	});

	socketRoutes.post('/gotoprev', function(req, res){	
		socket.sockets.emit("goto-prev");
		res.sendStatus(200);

	});

	socketRoutes.post('/gotonum', function(req, res){	
		socket.sockets.emit("goto-num", req.body.gotoNum);
		res.sendStatus(200);

	});

	app.use('/corsapi', socketRoutes);


	/* Operations - USB Detect */
	
	if (process.argv[2] == "--usbdetect" || process.argv[3] == "--usbdetect"){

		usbDetect = require('usb-detection');

		usbDetect.startMonitoring();

		usbDetect.on('change', function(device) { 
			socket.sockets.emit("usb-update", device);
		});

	}

	/* Raspi GPIO */ 

	if (process.argv[2] == "--gpio" || process.argv[3] == "--gpio"){

		const raspi = require('raspi'); 
		const gpio = require('raspi-gpio');

		raspi.init(() => {

			lastpedal1 = -1;	
			lastpedal2 = -1;

		  	const input1 = new gpio.DigitalInput({
		    	pin: 'GPIO24',
		    	pullResistor: gpio.PULL_UP
		  	});

		 	const input2 = new gpio.DigitalInput({
		    	pin: 'GPIO23',
		    	pullResistor: gpio.PULL_UP
		  	});

		  	input1.on('change', function(b){
		  		if (b!=lastpedal1) { socket.sockets.emit("foot-pedal-1", b); lastpedal1 = b; }
		  	});

		  	input2.on('change', function(c){
		  		if (c!=lastpedal2) { socket.sockets.emit("foot-pedal-2", c); lastpedal2 = c; }
		  	});

		});

	}


});