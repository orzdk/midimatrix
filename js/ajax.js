
/* Generic AJAX */

ajaxPost = function(url, data, callback){

	$.ajax({
	  	type: "POST",
	  	url: url,	  	
	  	data: data,
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(err){
	  		if (callback) callback(err);
	  	}
	});

}

/* System */

reboot = function(){
	$.ajax({
	  	type: "POST",
	  	url: "api/reboot"
	});

}

shutdown = function(callback){
	$.ajax({
	  	type: "POST",
	  	url: "api/shutdown"
	});

}

/* Scripts & Definitions */

saveScriptsDefinition = function(scriptsDef, callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/savescriptdefinitions",	  	
	  	data: { scriptsDef: scriptsDef },
	  	success: function(data){
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

saveScriptFile = function(data, callback){

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

/* Translations */

saveTranslations = function(data, callback){

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

/* Devices & Connections */

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

/* Filter Files */

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

runFilterFile = function(fileName, callback){

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

/* Patch Files */

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

