
var express = require('express');
var bodyParser = require('body-parser');
var cors = require("cors");
var fs = require('fs');

var app = express(); 
app.use(express.static(__dirname));
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
var server = app.listen(7001);
var socket = require("socket.io").listen(server);
var apiRoutes = express.Router(); 

var midiklik = require('./js/midiklik.js');
var ledwrapper = require('./js/ledwrapper.js');

LedWrapper = new ledwrapper();

MidiKlik = new midiklik();

MidiKlik.on('mk_routes', (data) => {
	LedWrapper.lightUp(data.routes);
    socket.sockets.emit("mk_routes", data);	 
});

MidiKlik.on('mk_message', (message) => {
	socket.sockets.emit("mk_message", message);	 
});


apiRoutes.post('/sendsysex', (req, res) => {	
	MidiKlik.sendSysEx(req.body.sysex);
});

apiRoutes.post('/requestconfiguration', (req, res) => {	
	MidiKlik.requestConfiguration();
    res.sendStatus(200);	
});

apiRoutes.post('/boottomidimode', (req, res) => {	
	MidiKlik.bootToMidiMode();
	res.sendStatus(200);	
});

apiRoutes.post('/sendserialchar', (req, res) => {	
	if (Object.keys(MidiKlik.serialPort).length > 0){
		MidiKlik.serialPort.write(req.body.char);
		res.sendStatus(200);
	} else {
		res.sendStatus(404);
	}
});

apiRoutes.post('/lightup', (req, res) => {	
	LedWrapper.lightUp(MidiKlik.currentRoutes.routes);
	res.sendStatus(200);	
});

apiRoutes.post('/lightdown', (req, res) => {	
	LedWrapper.lightDown();
	res.sendStatus(200);	
});

app.use('/api', apiRoutes);



