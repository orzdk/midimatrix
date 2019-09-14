
const { exec } = require('child_process');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const async = require('async');
const EventEmitter = require('events');

const DEFAULT_EOM = "6.USB product string"
const SERIAL_MODE_SYSEX = "F0 77 77 78 08 F7";
const SERIAL_MODE_SYSEX_WAIT = 2250;
const DEFAULT_WAIT = 1750;

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

	constructor() {
		
		super();

		var self = this;

		this.eventEmitter = {};

		this.serialPortOptions = {
		    baudRate : 115200,
		    dataBits : 8,
		    parity : 'none',
		    stopBits: 1,
		    flowControl : false,
		    lock:false
		}

		this.serialPort = {};
		this.serialBuffer = [];   
		this.lineStream = {};
		
		this.midiklikName = 'guapomidi';
		this.midiklikAlsaClientID = "";
		this.currentRoutes = {};
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

		this.alsaID(this.midiklikName, (alsaClientID) => {

			if (alsaClientID != false){

				var cmd = 'send_midi ' + alsaClientID + ':0 SYSEX,' + sysEx.toString().replaceAll(" ",",");
				shell(cmd, (shellReply) => {
					this.emit('mk_message', 'success' + cmd + JSON.stringify(shellReply));
					if (callback) callback(true);
				});	

			} else {
				this.emit('mk_message', 'fail_no_alsa' + this.midiklikName);
				if (callback) callback(false);

			}

		});
	}

	switchValue(s) {

		return s == "X" ? 1 : s == "." ? 0 : null;
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
			ttyACM0: false,
			currentRoutes: false,
			portOpen: false
		}

		let that = this;

		shell('ls /dev/ttyACM0', function(ls){

			if (ls.stdout.indexOf('/dev/ttyACM0') > -1){
				status.ttyACM0 = true;
			}

			if(Object.keys(that.currentRoutes).length > 0 ){
				status.currentRoutes = true;
			}

			if(Object.keys(that.serialPort).length > 0){
				status.portOpen = true;
			}

			callback(status);			
		});
	}

	keyCount(obj){
		if(obj){
			return Object.keys(obj).length;
		} else {
			return 0;
		}
	}

	requestConfiguration(){

		var that = this;

		that.emit("mk_message","config_request");

		that.checkCurrentConnectionStatus((currentStatus) => {

			that.emit("mk_message",currentStatus);

			if(currentStatus.currentRoutes == true){
				that.emit('mk_routes', that.currentRoutes);
			} else {
				if(currentStatus.ttyACM0 == true){
					if (currentStatus.portOpen == false) {
						that.serialPort = new SerialPort("/dev/ttyACM0", that.serialPortOptions); 
						that.lineStream = that.serialPort.pipe(new Readline("\r\n"));
						that.lineStream.on('data', (serialData) =>{
							let line = serialData.toString();
							that.serialBuffer.push(line);	
							if (line.indexOf(DEFAULT_EOM) > -1){
								let routes = that.processRoutingTable(that.serialBuffer);
								that.serialBuffer = [];	
								if (that.keyCount(routes.routes) > 0){
									that.currentRoutes = routes;						
									that.emit('mk_routes', routes);	
							  	};
							}
						});
						setTimeout(()=>{
							that.serialPort.write("0");
						},DEFAULT_WAIT);
					}
					else {
						that.serialPort.write("0");
					}
				}
			    else {
					that.sendSysEx(SERIAL_MODE_SYSEX, () => {
						setTimeout(()=>{
							that.serialPort = new SerialPort("/dev/ttyACM0", that.serialPortOptions); 
							that.lineStream = that.serialPort.pipe(new Readline("\r\n"));
							that.lineStream.on('data', (serialData) =>{
								let line = serialData.toString();
								that.serialBuffer.push(line);	
								if (line.indexOf(DEFAULT_EOM) > -1){
									let routes = that.processRoutingTable(that.serialBuffer);
									that.serialBuffer = [];
									if (that.keyCount(routes.routes) > 0){
										that.currentRoutes = routes;
										that.emit('mk_routes', routes);	
								  	};
								}
							});							
							setTimeout(()=>{
								that.serialPort.write("0");
							},DEFAULT_WAIT);
						},SERIAL_MODE_SYSEX_WAIT);
					});
				}
			}	

		});
	}
	
	bootToSerialMode(){

		var that = this;

		that.emit("mk_message","bootToSerial");

		that.checkCurrentConnectionStatus((currentStatus) => {

			that.emit("mk_message",currentStatus);

			shell('ls /dev/ttyACM0', function(ls){
				if (ls.stdout.indexOf('/dev/ttyACM0') > -1){
					that.emit("mk_message","ttyamc0_available");
					that.sendSysEx(SERIAL_MODE_SYSEX, () => {
						setTimeout(()=>{
							that.serialPort = new SerialPort("/dev/ttyACM0", that.serialPortOptions); 
							that.lineStream = that.serialPort.pipe(new Readline("\r\n"));
							that.lineStream.on('data', (serialData) =>{
								let line = serialData.toString();
								that.serialBuffer.push(line);	
								if (line.indexOf(DEFAULT_EOM) > -1){
									let routes = that.processRoutingTable(that.serialBuffer);
									that.serialBuffer = [];
									if (that.keyCount(routes.routes) > 0){
										that.currentRoutes = routes;
										that.emit('mk_routes', routes);	
								  	};
								}
							});							
							setTimeout(()=>{
								that.serialPort.write("0");
							},DEFAULT_WAIT);
						},SERIAL_MODE_SYSEX_WAIT);
					});
				} else{
					that.emit("mk_message","already in serial");
				}
			});
		});
	}


	bootToMidiMode(){

		this.emit("mk_message","boot_to_midi_mode");
		var that = this;
		shell('ls /dev/ttyACM0', function(ls){
			if (ls.stdout.indexOf('/dev/ttyACM0') > -1){
				that.emit("mk_message","ttyamc0_available");
				if(that.keyCount(that.serialPort) > 0){
					that.emit("mk_message","serialport_object_exist");
						that.serialPort.write("x");
						setTimeout(()=>{
							that.serialPort.write("y");
							setTimeout(()=>{
								that.serialPort = {};
							},500);
						},1000);
				}
				else {
					that.emit("mk_message","serialport_object_not_exist");
					that.serialPort = new SerialPort("/dev/ttyACM0", that.serialPortOptions); 
					that.serialPort.write("x");
					setTimeout(()=>{
						that.serialPort.write("y");
						setTimeout(()=>{
							that.serialPort = {};
						},500);
					},1000);
				}
			} else {
				that.emit("mk_message","ttyamc0_not_available, already in midi mode");
			}

		});	
	}

}

module.exports = MidiKlik;