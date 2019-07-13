
function sendMidi(sendmidistring, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/sendmidi",	  	
	  	data: { sendmidistring: sendmidistring },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function getTemp(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/gettemp",	  	
	  	data: { },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function reboot(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/reboot",	  	
	  	data: { },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function shutdown(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/shutdown",	  	
	  	data: { },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function getRunningScripts(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/getrunningscripts",	  	
	  	data: { },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}


function saveScriptsDefinition(scriptsDef, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savescriptdefinitions",	  	
	  	data: { scriptsDef: scripts },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function loadUnits(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/loadunits",	  	
	  	data: {},
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

function saveTranslations(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savetranslations",	  	
	  	data: data,
	  	success: function(data){
	  		if(callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if(callback) callback(errr);
	  	}
	});

}

function getTranslations(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/gettranslations",	  	
	  	data: {},
	  	success: function(data){
	  		if(callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if(callback) callback(errr);
	  	}
	});

}

function saveScriptFile(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savescriptfile",	  	
	  	data: data,
	  	success: function(data){
	  		if(callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if(callback) callback(errr);
	  	}
	});

}

connectDevices = function(from,to,callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/connectdevices",	  	
	  	data: {from: from, to: to},
	  	success: function(data){
	  		if (callback) callback();
	  	}, 
	  	error: function(data){

	  	}
	});

}

disconnectDevices = function(from,to, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/disconnectdevices",	  	
	  	data: {from: from, to: to},
	  	success: function(data){
	  		callback();
	  	}, 
	  	error: function(data){

	  	}
	});

}

clearAllConnections = function(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/clearallconnections",	  	
	  	data: {},
	  	success: function(data){
	  		callback(data);
	  	}, 
	  	error: function(data){

	  	}
	});

}

saveAppTemp = function(aas, callback){
	
	$.ajax({
	  	type: "POST",
	  	url: "api/saveapptemp",	  	
	  	data: { APP_SETTINGS: aas },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(data){

	  	}
	});

}

loadUnitColors = function(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/loadunitcolors",	  	
	  	data: {},
	  	success: function(data){
	  		callback(data);
	  	}, 
	  	error: function(data){

	  	}
	});

}

loadAppTemp = function(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/loadapptemp",	  	
	  	data: {},
	  	success: function(data){
	  		callback(JSON.parse(data));
	  	}, 
	  	error: function(data){

	  	}
	});

}

loadMidiDevices = function(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/getdevices",	  	
	  	data: {},
	  	success: function(midiDevices){  		
	  		callback(midiDevices);
		},
		error: function(data){
	  		console.log(data);
		}
	});

}

loadPatchFileList = function(callback){
	
	$.ajax({
	  	type: "POST",
	  	url: "api/getpatchfilelist",	  	
	  	data: {},
	  	success: function(data){
	  		callback(data);
	  	}, 
	  	error: function(data){

	  	}
	});

}

saveFilterFile = function(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savefilterfile",	  	
	  	data: data,
	  	success: function(data){
	  		callback(data);
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err); 
	  	}
	});

}

runFileSmart = function(fileName, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/runfilesmart",	  	
	  	data: { fileName:fileName },
	  	success: function(data){
	  		if (callback) callback(data);  		
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err);  	
	  	}
	});

}

stopFilterFile = function(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/stopfilterfile",	  	
	  	data: data,
	  	success: function(data){
	  		callback(data);  		
	  	}, 
	  	error: function(data){
	  		console.log(data);
	  	}
	});

}

deleteFilterFile = function(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/deletefilterfile",	  	
	  	data: data,
	  	success: function(data){
	  		callback(data);  		
	  	}, 
	  	error: function(data){
	  		console.log(data);
	  	}
	});

}

savePatchFile = function(data, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savepatch",	  	
	  	data: data,
	  	success: function(data){
	  		if (callback) callback(data); 
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err); 
	  	}
	});

}

loadPatchFile = function(patchFileName, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/loadpatch",	  	
	  	data: { filename: patchFileName },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err); 
	  	}
	});

}

deletePatchFile = function(filename, callback){
	
	$.ajax({
	  	type: "POST",
	  	url: "api/deletepatchfile",	  	
	  	data: { filename: filename },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err);
	  	}
	});

}

uploadDataToFile = function(data, callback){
	
	$.ajax({
	  	type: "POST",
	  	url: "api/uploaddatatofile",	  	
	  	data: { data },
	  	success: function(rep){
	  		if (callback) callback(rep);
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err);
	  	}
	});

}