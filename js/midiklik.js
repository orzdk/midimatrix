
const { exec } = require('child_process');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const EventEmitter = require('events');
const ledwrapper = require('./ledwrapper.js');

const DEFAULT_EOM = "6.USB product string"
const SERIAL_MODE_SYSEX = "77 77 78 08";

const SERIAL_MODE_SYSEX_WAIT = 2500;
const SERIAL_PORT_CREATE_WAIT = 1500;
const SERIAL_INPUT_WAIT = 1000;

String.prototype.replaceAll = function(search, replace) {
    var that = this;
    return that.replace(new RegExp(search, 'g'), replace);
}

var shell = (cmd, callback) => {
	exec(cmd, function(err, stdout, stderr){
    	callback({stdout: stdout, stderr: stderr});
	});
}

const MidiKlik = class extends EventEmitter {

	constructor(midiklikConfig) {
		
		super();

		this.serialPort = {};
		this.lineStream = {};
		this.routeCache = {};		 
		this.serialBuffer = [];		
		this.midiklikConfig = midiklikConfig;
		this.LedWrapper = new ledwrapper();
		this.onSerialData = this.onSerialData.bind(this);
    }

    mkEmitRoutes(data){
    	this.emit("mk",{type: "routes",data: data});
    }

    mkEmitMessage(data){
    	this.emit("mk",{type: "message",data: data});
    }

    mkEmitHeartbeat(data){
    	this.emit("mk",{type: "heartbeat",data: data});
    }

	keyCount(obj){
		if(obj){
			return Object.keys(obj).length;
		} else {
			return 0;
		}
	}

	switchValue(s) {

		return s == "X" ? 1 : s == "." ? 0 : null;
	}

	alsaID(name, callback){

		var rv = false;

		shell('sudo aconnect -l', function(data){
			var lines = data.stdout.split('\n');
			for (let c=0; c<lines.length; c++){
				if (lines[c].indexOf(name) > -1 && lines[c].indexOf("type=kernel") > -1){
					rv = lines[c].split(":")[0].split(" ")[1];
					break;
				}
			}
			callback(rv);
		});		
	}

	sendSysEx(sysEx, callback){

		var cmd = 'sudo /home/pi/midimatrix/tools/sendmidi dev "' + this.midiklikConfig.sysexConnectionName + '" hex syx ' + sysEx.toString();
		
		this.mkEmitMessage(cmd);

		shell(cmd, (shellReply) => {
			if (shellReply.stderr != "") this.mkEmitMessage("Error in sendSysEx() " + shellReply.stderr);
			if (callback) setTimeout(()=>{callback(true);},SERIAL_MODE_SYSEX_WAIT);
		});	
	}

	processRoutingTable(serialBuffer){

		let routes = [];
		let routeLine = [];
		let data = {}
		let routeSwitchX = [10,13,16,19,24,26,28,30,35,37,39,41];

		serialBuffer.forEach(y => {
			if(y.indexOf("->") > -1){
				routeLine = [];
				routeSwitchX.forEach(x => {
					routeLine.push(this.switchValue(y.substring(x,x+1)));
				});
				routes.push(routeLine);
			}
		});

	    data.filters = routes.slice(0,8).map(RTR => {
	       return RTR.slice(0,4).map(RTI => {
		       return RTI;
		    });
	    });;

		data.routes = routes.slice(0,8).map((RTR) => {
	       return RTR.slice(4).map(RTI => {
		       return RTI;
		    });
	    });

		return data;
	}

	checkCurrentConnectionStatus(callback){

		let status = {
			serialPortPath: false,
			routeCache: false,
			portOpen: false,
			alsaID: false
		}

		let that = this;

		shell('ls ' + this.midiklikConfig.serialPath, (ls)=>{
			that.alsaID(that.midiklikConfig.interfaceName, (alsaID)=>{

				if (ls.stdout.indexOf(this.midiklikConfig.serialPath) > -1){
					status.serialPortPath = true;
				}

				if(that.keyCount(that.serialPort) > 0){
					status.portOpen = true;
				}

				if(that.keyCount(that.routeCache) > 0 ){
					status.routeCache = true;
				}

				status.alsaID = alsaID;

				that.emit("mk_message",status);

				callback(status);			
			});
		});
	}

	writeSerial_EXIT(port){
		port.write("x");
		setTimeout(()=>{
			port.write("y");
				port = {};
		},SERIAL_INPUT_WAIT);
	}

	writeSerial_CHAR(port, char, wait){
		setTimeout(()=>{
			port.write(char);
		},wait);
	}

	onSerialData(serialData){
		let line = serialData.toString();
		this.mkEmitHeartbeat(line);		
		this.serialBuffer.push(line);	
		if (line.indexOf(DEFAULT_EOM) > -1){
			let routes = this.processRoutingTable(this.serialBuffer);
			this.serialBuffer = [];	
			if (this.keyCount(routes.routes) > 0){
				this.routeCache = routes;						
				this.mkEmitRoutes(routes);			
				if (this.midiklikConfig.ledEnabled == true) this.LedWrapper.lightUp(data.routes);	
		  	};
		}
	}

	requestConfiguration(){
		var that = this;

		that.mkEmitMessage("requestConfiguration()");

		that.checkCurrentConnectionStatus((currentStatus) => {
			if(currentStatus.routeCache == true){
				that.mkEmitMessage("*CACHE*");
				that.mkEmitRoutes(that.routeCache);
				if (that.midiklikConfig.ledEnabled == true) this.LedWrapper.lightUp(data.routes);
			} else {
				if(currentStatus.serialPortPath == true){
					if (currentStatus.portOpen == false) {
						that.mkEmitMessage(this.midiklikConfig.serialPath + " available. Creating new port");
						that.serialPort = new SerialPort(this.midiklikConfig.serialPath, that.midiklikConfig.serialPortOptions); 
						that.lineStream = that.serialPort.pipe(new Readline("\r\n"));
						that.lineStream.on('data', this.onSerialData);
						that.mkEmitMessage("Port connected, requesting Config");
						that.writeSerial_CHAR(that.serialPort, "0", SERIAL_PORT_CREATE_WAIT);
					}
					else {
						that.mkEmitMessage("Port connected, requesting Config");
						that.writeSerial_CHAR(that.serialPort, "0", 0);
					}
				}
			    else {
			    	that.bootToSerialMode()
				}
			}	
		});
	}
	
	bootToSerialMode(){
		var that = this;
		that.routeCache = {}		
		that.mkEmitMessage("bootToSerialMode() - Please wait");
		that.checkCurrentConnectionStatus((currentStatus) => {
			if(currentStatus.alsaID != false){
				that.sendSysEx(SERIAL_MODE_SYSEX, () => {
					that.serialPort = new SerialPort(that.midiklikConfig.serialPath, that.midiklikConfig.serialPortOptions); 
					that.lineStream = that.serialPort.pipe(new Readline("\r\n"));
					that.lineStream.on('data', this.onSerialData);	
					that.mkEmitMessage("Port connected, requesting Config");
					that.writeSerial_CHAR(that.serialPort, "0", SERIAL_PORT_CREATE_WAIT);
				});
			} else{
				that.mkEmitMessage("No AlsaID. Already in serial mode ?");
			}
		});
	}

	bootToMidiMode(){
		var that = this;
		that.routeCache = {}
		that.mkEmitMessage("bootToMidiMode() - Please wait");
		that.checkCurrentConnectionStatus((currentStatus) => {
			if(currentStatus.serialPortPath == true){
				if(currentStatus.portOpen == true){
					that.mkEmitMessage("Port open, writeSerial_EXIT 0");			
					that.writeSerial_EXIT(that.serialPort,0)
				}
				else {
					that.mkEmitMessage(that.midiklikConfig.serialPath + " available, creating new serialPort");			
					that.serialPort = new SerialPort(that.midiklikConfig.serialPath, that.midiklikConfig.serialPortOptions); 
					that.mkEmitMessage("Port open, writeSerial_EXIT " + SERIAL_PORT_CREATE_WAIT);			
					that.writeSerial_EXIT(that.serialPort, SERIAL_PORT_CREATE_WAIT);
				}
			} else {
				that.mkEmitMessage(that.midiklikConfig.serialPath + " not available. Already in MIDI mode ?");
			}
		});	
	}

}

module.exports = MidiKlik;