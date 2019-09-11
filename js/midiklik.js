
const { exec } = require('child_process');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const EventEmitter = require('events');

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

	connectSerial(command, callback){

		var that = this;

		shell('ls /dev/ttyACM0', function(ls){

			if (ls.stdout.indexOf('/dev/ttyACM0') > -1){

				if(Object.keys(that.serialPort).length == 0){

					that.serialPort = new SerialPort("/dev/ttyACM0", that.serialPortOptions); 
					const lineStream = that.serialPort.pipe(new Readline("\r\n"));

					setTimeout(()=>{

						that.serialPort.write("0");

						lineStream.on('data', (serialData) => {

							let line = serialData.toString();
							that.serialBuffer.push(line);	

							if (line.indexOf("6.USB product string") > -1){

								let routes = that.processRoutingTable(that.serialBuffer);

								if (Object.keys(routes.routes).length > 0){
									 that.emit('routes', routes);	
							  	};

								that.serialBuffer = [];
							}

						});

					},500);

				} else {

					if (command == 'midimode') {

						that.serialPort.write("x");
						setTimeout(()=>{
							that.serialPort.write("y");
							setTimeout(()=>{
								that.serialPort = {};
							},500);
						},1000);

					}

				}

			}

		});	
	}
	
}

module.exports.MidiKlik = MidiKlik;