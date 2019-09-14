
var selectedFrom = "";
var selectedFromFoot = false;
var selectedFromScript = "";
var setToRename = "";
var holdRenameTimer = {};
var currentPatchIdx = 0;
var semf = null;
var unitColors;

var ip = "192.168.0.23:8000";
var WEB_MIDI = 1;

/* Render & Refresh ---------------------------------------- */

render = function(){
	ajaxPost('api/loadunitcolors', null, function(uColors){

		unitColors = uColors;

		renderDeviceButtons();
		renderConnections();
		renderScripts();

		$("#tempmsg").html(APP_STATE.APP_TEMP);	

		thankYou();

	});
}

refresh = function(callback){
	ajaxPost('api/getsystemstate', null, function(appState){
		APP_STATE = appState;
		if (callback) callback(); else render();
	});
}

/* LOOKUP --------------------------------------------------- */

translatedName = function(clientOriginalName, direction, co){

	if (APP_STATE.APP_SETTINGS 
		&& APP_STATE.APP_SETTINGS.translations 
		&& APP_STATE.APP_SETTINGS.translations[clientOriginalName] 
		&& APP_STATE.APP_SETTINGS.translations[clientOriginalName][direction] 
		&& APP_STATE.APP_SETTINGS.translations[clientOriginalName][direction] != "" 
	)
	return APP_STATE.APP_SETTINGS.translations[clientOriginalName][direction]

	return clientOriginalName + co; 	
}

prettyName = function(uglyName){
	var fnn = uglyName.replaceAll('_');
	fnn = fnn.substring(0,1).toUpperCase() + fnn.substring(1,fnn.length).toLowerCase();

	return fnn;
}

/* PATCHES --------------------------------------------------- */

processPatch = function(patchData){

	pleaseWait();

	clearAllConnections(function(){

		async.forEachOf(patchData.APP_STATE.APP_RUNNING_SCRIPTS, (filter, key, callback) => {

			runFilterFile(filter, function(runTime){
				callback();
			});

		}, err => {

		   	refresh(function(){

			    async.forEachOf(patchData.APP_STATE.APP_CONNECTIONS.alsaDeviceConnections, (connection, key, callback) => {
			    	
			    	curIDFrom = APP_STATE.APP_CONNECTIONS.alsaClients[connection.from.alsaClientName] + ":" + connection.from.alsaDeviceNum;
			    	curIDTo = APP_STATE.APP_CONNECTIONS.alsaClients[connection.to.alsaClientName] + ":" + connection.to.alsaDeviceNum;

			    	connectDevices(curIDFrom, curIDTo, function(){
			    		callback();
			    	});

			    }, err2 => {
			    	
			    	saveTranslations({translations:patchData.APP_STATE.APP_SETTINGS.translations}, function(){
				    	refresh();
			    	});

		    	});
			    
			});

		});

	});
}

loadPatch = function(patchIdx){

	currentPatchIdx = patchIdx;

	loadPatchFile(APP_STATE.APP_PATCHES[patchIdx], function(data){
		processPatch(data);
	});
}

savePatch = function(){

	fileName = $("#filename").val();

	APP_STATE.APP_SETTINGS.footNumbers = {
		f1: { co:  Number($("#foot1_controller").val()), va:  Number($("#foot1_value").val()), ch: Number($("#foot1_channel").val()), ev: $("#foot1_event").val(), evv: Number($("#foot1_eventvalue").val())},
		f2: { co:  Number($("#foot2_controller").val()), va:  Number($("#foot2_value").val()), ch: Number($("#foot2_channel").val()), ev: $("#foot2_event").val(), evv: Number($("#foot2_eventvalue").val())},
		f3: { co:  Number($("#webmidi_controller").val()), va:  Number($("#webmidi_value").val()), ch: Number($("#webmidi_channel").val())},
		f4: { co:  Number($("#nrpn_controller").val()), va:  Number($("#nrpn_value").val()), ch: Number($("#nrpn_channel").val())}
	}

	patchData = {
		filename: fileName,
		patch: {
			APP_STATE: APP_STATE
		}
	}

	saveTranslations({translations:APP_STATE.APP_SETTINGS.translations}, function(){
		savePatchFile(patchData, function(newlist){
			APP_STATE.APP_PATCHES = newlist;
			render();
		});
	});
}

deletePatch = function(){

	fileName = $("#filename").val();

	if (fileName != 'DEFAULT') {
		patchData = {
			filename: fileName,
			patch: {}
		}

		deletePatchFile(patchData, function(newlist){
			APP_STATE.APP_PATCHES = newlist;
			render();
		});
	}
}

/* FROM-TO  --------------------------------------------------- */

setFrom = function(alsaDeviceID){

	console.log("setFrom", alsaDeviceID);

	$("#cfoot1").removeClass("mm-but-selected");
	$("#cfoot2").removeClass("mm-but-selected");
	$(".setfrom").removeClass("mm-but-selected");
	$(".mm-but-filter").removeClass("mm-but-selected");

	if (alsaDeviceID.indexOf("foot") > -1){
	
		spl = -1;

		if (spl>-1){
			selectedFromFoot = false;
		} else {
			$("#c" + alsaDeviceID).addClass("mm-but-selected");
			selectedFromFoot = alsaDeviceID; 				
		} 

	} else {

		selectedFromFoot = false;

		if (selectedFrom == alsaDeviceID){
			selectedFrom = "";
			return;
		}

		$("#setto" + alsaDeviceID.replace(":","_")).addClass("mm-but-selected");

		selectedFrom = alsaDeviceID;
		console.log(selectedFrom);
	}

}

setTo = function(alsaDeviceID){

	console.log("setTo", alsaDeviceID);

	setToRename = alsaDeviceID;
 
	$("#setfrom" + alsaDeviceID.replace(":","_")).addClass("mm-but-selected");

	if (selectedFromFoot != false){

		alsaDeviceNameID = APP_STATE.APP_CONNECTIONS.alsaDevices[alsaDeviceID].alsaDeviceNameID;
		alsaDevice = APP_STATE.APP_CONNECTIONS.alsaDevices[alsaDeviceID];

		if (!APP_STATE.APP_SETTINGS.customConnections) APP_STATE.APP_SETTINGS.customConnections = [];
		APP_STATE.APP_SETTINGS.customConnections.push( { foot: selectedFromFoot, alsaDeviceID: alsaDeviceID, alsaDeviceNameID: alsaDeviceNameID, alsaDeviceName: translatedName(alsaDevice.alsaDeviceClientName, "inputName", alsaDevice.alsaClientName) } )

		$("#cfoot1").removeClass("mm-but-selected");
		$("#cfoot2").removeClass("mm-but-selected");

		renderConnections();
		
	}
	else {
		console.log("setFrom", selectedFrom, alsaDeviceID);

		if (selectedFrom != ""){

			connectDevices(selectedFrom, alsaDeviceID, function(){
				refresh()
			});

			selectedFrom = "";
			
		}
	}
}

setFromScript = function(scriptIdx){

	$(".mm-but-action").val("APPLY");
	$("#scriptstart").removeClass("mm-hidden");

	if (selectedFromScript == scriptIdx){
		selectedFromScript = "";
		$("#script" + scriptIdx).addClass("mm-but-connection");
		$("#script" + scriptIdx).removeClass("mm-but-selected");
		$("#scriptstart").addClass("mm-hidden");
		return;
	}

	$(".mm-but-filter").removeClass("mm-but-selected");
	$(".setfrom").removeClass("mm-but-selected");

	$("#script" + scriptIdx).removeClass("mm-but-connection");
	$("#script" + scriptIdx).addClass("mm-but-selected");

	selectedFromScript = scriptIdx;
}

setToScript = function(connectionID){
	
	clickedConnection = APP_STATE.APP_CONNECTIONS.alsaDeviceConnectionsObj[connectionID];

	$(".mm-but-action").val("Disconnect");

	if (selectedFromScript && selectedFromScript != ""){

		connectScript(selectedFromScript, connectionID, function(){
			refresh();
		});

		selectedFromScript = "";
		
	} else { 

		disconnectSelected();

	}
}

/* MIDIDINGS ---------------------------------------------- */

setAutoTranslations = function(runtime){

	console.log(runtime);

	newClient = runtime.midiDevices.alsaDevices[runtime.newClient + ":0"];
	newClient2 = runtime.midiDevices.alsaDevices[runtime.newClient + ":1"];

	APP_STATE.APP_SETTINGS.translations[newClient.alsaDeviceClientName] = {}
	APP_STATE.APP_SETTINGS.translations[newClient.alsaDeviceClientName].inputName = fileName;
	APP_STATE.APP_SETTINGS.translations[newClient.alsaDeviceClientName].outputName = fileName;

	APP_STATE.APP_SETTINGS.translations[newClient2.alsaDeviceClientName] = {}
	APP_STATE.APP_SETTINGS.translations[newClient2.alsaDeviceClientName].inputName = fileName;
	APP_STATE.APP_SETTINGS.translations[newClient2.alsaDeviceClientName].outputName = fileName;

	saveTranslations({translations:APP_STATE.APP_SETTINGS.translations}, function(){
    	refresh();
	});
}

startScript = function(){

	pleaseWait();

	fileName = APP_STATE.APP_SCRIPTS[selectedFromScript].title;

	runFilterFile(fileName, function(runtime){
		setAutoTranslations(runtime);
	});

	selectedFromScript = "";
}

connectScript = function(script){

	pleaseWait();

	fileName = APP_STATE.APP_SCRIPTS[script].title;

	runFilterFile(fileName, function(runtime){

		setAutoTranslations(runtime);

		newClientID = runtime.newClient;
		newClientPID = runtime.newClientPID;
		newClientName = runtime.midiDevices.alsaDevices[newClientID + ":0"].alsaClientName;

		from = clickedConnection.from.alsaDeviceID;
		to = clickedConnection.to.alsaDeviceID;
	
		disconnectConnection(from,to);				
		connectDevices(from, newClientID + ":0");
		connectDevices(newClientID + ":1", to);

		refresh();

	});
}

/* Connections -------------------------------------------- */

renameDeviceConnection = function(){

	sel = setToRename != "" ? setToRename : selectedFrom;

	selectedName = APP_STATE.APP_CONNECTIONS.alsaDevices[sel].alsaDeviceClientName;

	APP_STATE.APP_SETTINGS.translations[selectedName] = {}
	APP_STATE.APP_SETTINGS.translations[selectedName].inputName = $("#inputName").val();
	APP_STATE.APP_SETTINGS.translations[selectedName].outputName = $("#outputName").val();
	
	$(".renamecontrol").addClass("mm-hidden");
	$(".stopcontrol").addClass("mm-hidden");

	selectedFrom = "";
	setToRename = "";

	render();
}

disconnectConnection = function(from, to){

	disconnectDevices(from, to, function(){
		ajaxPost('api/getmididevices', null, function(midiDevices){
			APP_STATE.APP_CONNECTIONS = midiDevices;
			render();
		});		
	});
}

disconnectSelected = function(){

	from = clickedConnection.from.alsaDeviceID;
	to = clickedConnection.to.alsaDeviceID;

	disconnectConnection(from, to);
}

refreshUI = function(){

	window.location.href = 'http://' + ip;
}

/* RENDER   ----------------------------------------------- */

renderDeviceButtons = function(){

	$("#fromdevices").empty();
	$("#todevices").empty();

	$.each(APP_STATE.APP_CONNECTIONS.alsaDevices, function(alsaDeviceID, alsaDevice){

		hideOutput = false;
		hideInput = false;
		classs = "mm-but mm-but-connection";
		classs += " uc " + unitColors[alsaDevice.alsaDeviceName];

  		outputName = translatedName(alsaDevice.alsaDeviceClientName, "outputName", alsaDevice.alsaClientName);
  		inputName = translatedName(alsaDevice.alsaDeviceClientName, "inputName", alsaDevice.alsaClientName);

		if (alsaDevice.alsaDeviceNameID.indexOf("in_") > -1) {
			hideOutput = true;
			classs = "mm-but mm-but-filter";
			inputName = prettyName(inputName);
		} else if (alsaDevice.alsaDeviceNameID.indexOf("out_") > -1) {
			hideInput = true;
			classs = "mm-but mm-but-filter";
			outputName = prettyName(outputName);
		}

		var inputClass  = (alsaDevice.alsaDeviceIO.indexOf("I") > -1 && hideInput == false) ? classs : (hideInput == true ? "mm-but-none" : "mm-but-disabled");
		var outputClass = (alsaDevice.alsaDeviceIO.indexOf("O") > -1 && hideOutput == false) ? classs : (hideOutput == true ? "mm-but-none" : "mm-but-disabled");

		var outputButton;
		var inputButton;

		if (alsaDevice.alsaDeviceNameID.indexOf("in_") > -1 || alsaDevice.alsaDeviceNameID.indexOf("out_") > -1){
			outputButton = 
			'<input title="' + alsaDevice.alsaClientName + " " + outputName + ", " + alsaDevice.alsaDeviceID 
			+ '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID 
			+ '\')" class="setfrom '  + outputClass + '" id="setto' + alsaDeviceID.replace(":","_")  
			+ '" onclick="setFrom(\'' + alsaDeviceID + '\')" value="' + outputName + '"/>';	

			inputButton = '<input title="' + alsaDevice.alsaClientName + " " + inputName + ", " + alsaDevice.alsaDeviceID 
			+ '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID 
			+ '\')" class="setto ' + inputClass + '" id="setfrom'  + alsaDeviceID.replace(":","_")  
			+ '" onclick="setTo(\'' + alsaDeviceID + '\')" value="' + inputName + '"/>';

			$("#todevices").append($(inputButton));			 				
			$("#fromdevices").append($(outputButton));
		} else 
		{
			outputButton = 
			'<input title="' + alsaDevice.alsaClientName + " " + outputName + ", " + alsaDevice.alsaDeviceID 
			+ '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID 
			+ '\')" class="setto '  + outputClass + '" id="setfrom' + alsaDeviceID.replace(":","_")  
			+ '" onclick="setTo(\'' + alsaDeviceID + '\')" value="' + outputName + '"/>';	

			inputButton = '<input title="' + alsaDevice.alsaClientName + " " + inputName + ", " + alsaDevice.alsaDeviceID 
			+ '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID 
			+ '\')" class="setfrom ' + inputClass + '" id="setto'  + alsaDeviceID.replace(":","_")  
			+ '" onclick="setFrom(\'' + alsaDeviceID + '\')" value="' + inputName + '"/>';

			$("#fromdevices").append($(inputButton));			 				
			$("#todevices").append($(outputButton));
		}

	});
	
	var foot1Button = $('<input type="button" class="mm-but mm-but-foot" id="cfoot1" onclick="setFrom(\'foot1\')" value="Custom1"/>'); 
	var foot2Button = $('<input type="button" class="mm-but mm-but-foot" id="cfoot2" onclick="setFrom(\'foot2\')" value="Custom2"/>'); 
	$("#fromdevices").append(foot1Button);
	$("#fromdevices").append(foot2Button);
}

renderConnections = function(){

	var $table = $('#connection-table');
	$table.empty();

	$("#fileUploaded").addClass("mm-hidden");

	$.each(APP_STATE.APP_CONNECTIONS.alsaDeviceConnections, function(id,connection){

		oclasss = connection.from.alsaDeviceNameID.indexOf("out_") > -1 ? "mm-but mm-but-filter" : "mm-but mm-but-connection" + " uc " + unitColors[connection.from.alsaDeviceName];
		iclasss = connection.to.alsaDeviceNameID.indexOf("in_") > -1 ? "mm-but mm-but-filter" : "mm-but mm-but-connection" + " uc " + unitColors[connection.to.alsaDeviceName];

  		$table.append("<tr>");
  		$table.append("<td><input title='" + translatedName(connection.from.alsaDeviceClientName,"outputName", connection.from.alsaClientName) + ', ' + connection.from.alsaDeviceID + "' type='button' class='" + oclasss + "' value='" + prettyName(translatedName(connection.from.alsaDeviceClientName,"outputName")) + "'></td>")
  		$table.append("<td><input onclick='setToScript(\"" + connection.connectionUID + "\")' type='button' class='mm-but mm-but-action' value='Disconnect'></td>")
  		$table.append("<td><input title='" + translatedName(connection.to.alsaDeviceClientName,"inputName", connection.to.alsaClientName) + ', ' + connection.to.alsaDeviceID + "' type='button' class='" + iclasss + "' value='" + prettyName(translatedName(connection.to.alsaDeviceClientName,"inputName")) + "'></td>")
  		$table.append("</tr>");

	});

	/* Render customConnections */

	if (APP_STATE.APP_SETTINGS && APP_STATE.APP_SETTINGS.customConnections)
	for (var a=0;a<APP_STATE.APP_SETTINGS.customConnections.length;a++){
		classs = "mm-but mm-but-foot ";
		classss = "mm-but mm-but-connection";

  		$table.append("<tr>");
  		$table.append("<td><input title='Custom MIDI Send - Configure using SendMidi Checkbox' type='button' class='" + classs + "' value='" + APP_STATE.APP_SETTINGS.customConnections[a].foot.replace("foot","Custom ") + "'></td>")
  		$table.append("<td><input onclick='removeCustomConnection(\"" + outputName + "\")' type='button' class='mm-but mm-but-action' value='Disconnect'></td>")
  		$table.append("<td><input title='Custom MIDI Receive - Configure using SendMidi Checkbox' type='button' class='" + classss + "' value='" +  APP_STATE.APP_SETTINGS.customConnections[a].alsaDeviceName + "'></td>")
  		$table.append("</tr>");
	}
}

renderScripts = function() {

	$(".footer-div").empty();

	/* Scripts  */

	if (APP_STATE.APP_SETTINGS && APP_STATE.APP_SETTINGS.footNumbers && Object.keys(APP_STATE.APP_SETTINGS.footNumbers).length > 0){

		var fn = APP_STATE.APP_SETTINGS.footNumbers;

		$("#foot1_controller").val(fn.f1.co);
		$("#foot1_value").val(fn.f1.va);
		$("#foot1_channel").val(fn.f1.ch);
		$("#foot1_event").val(fn.f1.ev);
		$("#foot1_eventvalue").val(fn.f1.evv);

		$("#foot2_controller").val(fn.f2.co);
		$("#foot2_value").val(fn.f2.va);
		$("#foot2_channel").val(fn.f2.ch);
		$("#foot2_event").val(fn.f2.ev);
		$("#foot2_eventvalue").val(fn.f2.evv);

		$("#webmidi_controller").val(fn.f3.co);
		$("#webmidi_value").val(fn.f3.va);
		$("#webmidi_channel").val(fn.f3.ch);

	}

	$(".footer-div").append("<div class='flex-container'>");

	for (s=0;s<APP_STATE.APP_SCRIPTS.length;s++){
		$(".footer-div").append("<input type='button' onclick='setFromScript(\"" + s + "\")' id='script" + s + "' class='mm-but mm-but-filter' value='" + prettyName(APP_STATE.APP_SCRIPTS[s].title)  + "'>");
	}

	$("#foooter").append("<input type='button' onclick='startScript()' id='scriptstart' class='mm-but mm-but-script mm-hidden foo' value='" + "Start"  + "'>");
	$(".footer-div").append("</div>");

	/* Patches  */

	$(".footer-div").append("<div class='flex-container'>");

	$.each(APP_STATE.APP_PATCHES, function(key,obj){
		if (obj.toString() != "_translations.json")
		$(".footer-div").append("<input onclick='loadPatch(\"" + key + "\")' type='button' class='mm-but mm-but-script' value='" + obj.toString().replace('.json','').replace('_','') + "'>");
	});	

	$(".footer-div").append("</div>");


}

/* Misc -------------------------------------------------- */

pleaseWait = function(){

	$("#pleaseWait").removeClass("mm-hidden");

}

thankYou = function(){

    $("#pleaseWait").addClass("mm-hidden");

}

hardReset = function(){

	pleaseWait();

	$.ajax({
	  	type: "POST",
	  	url: "api/hardreset",	  	
	  	data: {},
	  	success: function(data){
	  		setTimeout(function(){
	  			window.location.reload();
	  		},1500);
	  	}, 
	  	error: function(data){}
	});

}

stopFilter = function(){

	pleaseWait();
	cancelRename();

	stopFilterFile({pid:Number(selectedPID)}, function(){
		refresh();
	});
	
}

holdRenameRelease = function(){

	clearTimeout(holdRenameTimer);

}

holdToRename = function(realA){

	holdRenameTimer = setTimeout(function(){

		isFilter = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaClientIsFilter
		selectedPID = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaClientPID;
		selectedName = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaDeviceClientName;
		selectedCName = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaClientName;
		selectedDeviceID = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaDeviceID;

		outputName = selectedDeviceID + " " + translatedName(selectedName,"outputName",selectedCName);
  		inputName = selectedDeviceID + " " + translatedName(selectedName,"inputName",selectedCName);

		$(".renamecontrol").removeClass("mm-hidden");

  		if (isFilter == true){
  			$(".stopcontrol").removeClass("mm-hidden");
  		} else {
  			$(".stopcontrol").addClass("mm-hidden");
  		}

		$("#inputName").val(inputName);
		$("#outputName").val(outputName);

	},600);

}

cancelRename = function(){

	$(".renamecontrol").addClass("mm-hidden");
	$(".stopcontrol").addClass("mm-hidden");
	$(".setfrom").removeClass("mm-but-selected");

}

removeCustomConnection = function(foot){

	for (var a=0;a<APP_STATE.APP_SETTINGS.customConnections.length;a++){
		if (APP_STATE.APP_SETTINGS.customConnections.foot == foot){
			spl = a;
		}
	}

	APP_STATE.APP_SETTINGS.customConnections.splice(a-1,1);
	renderConnections();

}

printer = function(msg){
	if($("#printermessages").children().length > 12) $("#printermessages").children().last().remove();
	$("#printermessages").prepend("<div style='display:block'>" + msg + "</div>");

}

blink = function(control, time){

	$("#" + control).addClass("red");

	setTimeout(function(){
		$("#" + control).removeClass("red");

	},time);

}

sendMidi = function(customConnID){

	var destinationName;

	event = $("#" + customConnID + "_event").val();
	controller = Number($("#" + customConnID + "_controller").val());
	value = Number($("#" + customConnID + "_value").val());

	if (APP_STATE.APP_SETTINGS && APP_STATE.APP_SETTINGS.customConnections)
	for (a=0;a<APP_STATE.APP_SETTINGS.customConnections.length;a++){
		if (APP_STATE.APP_SETTINGS.customConnections[a].foot == customConnID){
			destinationName = APP_STATE.APP_SETTINGS.customConnections[a].alsaDeviceNameID;
		}
	}

	if (event != ""){
		ccString = "dev \"" + destinationName + '\" ' + event + " " + Number($("#" + customConnID + "_eventvalue").val());
	} else {
		ccString = "dev \"" + destinationName + '\" cc ' + controller + " " + value;
	}

	if(destinationName) 
	ajaxPost('api/sendmidi', { sendmidistring: ccString }, function(sendMidiReply){
		printer(JSON.stringify(sendMidiReply));
	});	

}

$("#saveSettings").on("click", function(){
	savePatch();
});

$("#deleteSettings").on("click", function(){
	deletePatch();
});

/* STARTUP   ----------------------------------------------------- */

$(document).ready(function(){

	/* Socket Listeners */

	var socket = io.connect(ip);

	socket.on("printer", function(msg, d) {

		printer(msg);
	
	});

	socket.on("usb-update", function(msg, d) {

		refresh();
	
	});

	socket.on("goto-next", function() {

		if (APP_STATE.APP_PATCHES.length > currentPatchIdx) {
			currentPatchIdx++;
			loadPatch(currentPatchIdx);
		}

	});

	socket.on("goto-prev", function() {

		if (currentPatchIdx > 0) {
			currentPatchIdx--;
			loadPatch(currentPatchIdx);
		}

	});

	socket.on("goto-num", function(num) {

		if (APP_STATE.APP_PATCHES[num]) {
			currentPatchIdx = num;	
			loadPatch(currentPatchIdx);
		}

	});

	socket.on("foot-pedal-1", function(msg) {
		
		blink("foot1_fire", 250);

		if (semf == null) {
			sendMidi('foot1');
			semf = "block";
			setTimeout(function(){
				semf = null;
			},250);
		}

	});

	socket.on("foot-pedal-2", function(msg) {

		blink("foot2_fire", 250);
		
		if (semf == null) {
			sendMidi('foot2');
			semf = "block";
			setTimeout(function(){
				semf = null;
			},250);
		}

	});

	/* Events */

	$("#foot1_fire").on("click", function(){

		sendMidi('foot1');

	});

	$("#foot2_fire").on("click", function(){

		sendMidi('foot2');

	});

	$("#checkShowSendMidi").on("change", function(e){

		c = $("#checkShowSendMidi").is(":checked");

		if (c == true){
			$("#sendMidiSpan").removeClass("mm-hidden");
		} else {
			$("#sendMidiSpan").addClass("mm-hidden");
		}
	
	});

	/* WebMidi */

	if (WEB_MIDI == 1){
		WebMidi.enable(function (err) {

			if (err) {
				console.log("WebMidi could not be enabled.", err);
			} else {
				console.log("WebMidi could not not be enabled.");

				var CC = { 
					controller: 0, 
					value:  0, 
					channel: 0 
				
				}

				var NPRN = {
					m1: { controller: 0, value:  0, channel: 0 },
					m2: { controller: 0, value:  0, channel: 0 },
					m3: { controller: 0, value:  0, channel: 0 },
					m4: { controller: 0, value:  0, channel: 0 }
				
				}

				var getWebMidiInputsOutputs = function(){

					var $outputs = $("#webmidi-output-select");

					$.each(WebMidi.outputs, function(i,o) {
						$outputs.append($("<option />").val(o.name).text(o.name));
					});

				}

				var sendNPRN = function(outputname, nprn){
					
					var output = WebMidi.getOutputByName(outputname);

					output.sendControlChange(nprn.m1.controller, nprn.m1.value, nprn.m1.channel)
					output.sendControlChange(nprn.m2.controller, nprn.m2.value, nprn.m2.channel)
					output.sendControlChange(nprn.m3.controller, nprn.m3.value, nprn.m3.channel)
					output.sendControlChange(nprn.m4.controller, nprn.m4.value, nprn.m4.channel)

				}

				var sendCC = function(outputname, cc){
					
					var output = WebMidi.getOutputByName(outputname);
					output.sendControlChange(cc.controller, cc.value, cc.channel)

				}

				var sendWebMidi = function(sid){

					device = $("#webmidi-output-select").val();

					controller = Number($("#webmidi_controller").val());
					value = Number($("#webmidi_value").val());
					channel = Number($("#webmidi_channel").val());

					M = { controller, value, channel }

					sendCC(device, M);

				}

				$("#webmidi_fire").on("click", function(){
					sendWebMidi('webmidi');
				});

				getWebMidiInputsOutputs();	
			}

		}); 
	
	} 

	refresh();		

});