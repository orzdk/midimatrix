
var APP_STATE = {
	APP_CONNECTIONS:{},
	APP_RUNNING_SCRIPTS:[],
	APP_PATCHES:{},
	APP_SCRIPTS:{},
	APP_SETTINGS: {
		translations: {}
	}
}

var selectedFrom = "";
var selectedFromFoot = false;
var selectedFromScript = "";
var setToRename = "";
var holdRenameTimer = {};
var currentPatchIdx = 0;
var semf = null;
var unitColors;

var WEB_MIDI = 0;
var ip = "192.168.0.21:8000";

/* Render & Refresh ---------------------------------------- */

render = function(){

	loadUnitColors(function(_unitColors){
		unitColors = _unitColors;
		renderDeviceButtons();
		renderConnections();
		renderScripts();
		thankYou();
	});

}

refresh = function(callback){

	loadMidiDevices(function(midiDevices){
		loadPatchFileList(function(patchList){
			loadScriptDefinitions(function(scripts){
				getRunningScripts(function(runningScripts){
					getTemp(function(tempdata){
						getTranslations(function(translations){

							APP_STATE.APP_RUNNING_SCRIPTS = runningScripts || [];
							APP_STATE.APP_CONNECTIONS = midiDevices;
							APP_STATE.APP_PATCHES = patchList;
							APP_STATE.APP_SCRIPTS = scripts;
							APP_STATE.APP_SETTINGS.translations = translations; 

							$("#tempmsg").html(tempdata.r1.stdout.replace("temp=","PI Temp: "));	
							console.log(APP_STATE);
							
							callback();
						});
					});
				});
			});
		});
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

/* PATCHES --------------------------------------------------- */

processPatch = function(patchData){

	pleaseWait();

	clearAllConnections(function(){

		async.forEachOf(patchData.APP_STATE.APP_RUNNING_SCRIPTS, (filter, key, callback) => {

			runFileSmart(filter, function(runTime){
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
				    	refresh(function(){
							render();
						});
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

	if (fileName != 'DEFAULT') {

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
		
		savePatchFile(patchData, function(newlist){
			APP_STATE.APP_PATCHES = newlist;
			render();
		});

	}

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
		}

}

setTo = function(alsaDeviceID){

	setToRename = alsaDeviceID;

	$("#setfrom" + alsaDeviceID.replace(":","_")).addClass("mm-but-selected");

	if (selectedFromFoot != false){

		alsaDeviceNameID = APP_STATE.APP_CONNECTIONS.alsaDevices[alsaDeviceID].alsaDeviceNameID;

		if (!APP_STATE.APP_SETTINGS.feet) APP_STATE.APP_SETTINGS.feet = [];
		APP_STATE.APP_SETTINGS.feet.push( { foot: selectedFromFoot, alsaDeviceID: alsaDeviceID, alsaDeviceNameID: alsaDeviceNameID } )

		$("#cfoot1").removeClass("mm-but-selected");
		$("#cfoot2").removeClass("mm-but-selected");

		renderConnections();
		
	}
	else {

		if (selectedFrom != ""){

			connectDevices(selectedFrom, alsaDeviceID, function(){
				loadMidiDevices(function(midiDevices){
					APP_STATE.APP_CONNECTIONS = midiDevices;
					render();
				});
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

	$(".mm-but-action").val("DISCO");

	if (selectedFromScript && selectedFromScript != ""){

		connectScript(selectedFromScript, connectionID, function(){
			refresh(function(){
				render();
			});
		});

		selectedFromScript = "";
		
	} else { 

		disconnectSelected();

	}

}

/* MIDIDINGS ---------------------------------------------- */

startScript = function(connectionID){

	pleaseWait();

	selectedFromScript = "";

	runFileSmart(fileName, function(runtime){
		refresh(function(){
			render();
		});
	});

}

connectScript = function(script, connection){

	pleaseWait();

	fileName = APP_STATE.APP_SCRIPTS[script].title;

	runFileSmart(fileName, function(runtime){

		newClientID = runtime.newClient;
		newClientPID = runtime.newClientPID;
		newClientName = runtime.midiDevices.alsaDevices[newClientID + ":0"].alsaClientName;

		from = clickedConnection.from.alsaDeviceID;
		to = clickedConnection.to.alsaDeviceID;
	
		disconnectConnection(from,to);				
		connectDevices(from, newClientID + ":0");
		connectDevices(newClientID + ":1", to);

		refresh(function(){
			render();
		});

	});

}

/* Connections -------------------------------------------- */

renameDeviceConnection = function(){

	sel = setToRename != "" ? setToRename : selectedFrom;

	selectedName = APP_STATE.APP_CONNECTIONS.alsaDevices[sel].alsaDeviceName;

	inputName = $("#inputName").val();
	outputName = $("#outputName").val();

	APP_STATE.APP_SETTINGS.translations[selectedName] = {}
	APP_STATE.APP_SETTINGS.translations[selectedName].inputName = inputName;
	APP_STATE.APP_SETTINGS.translations[selectedName].outputName = outputName;
	
	$(".renamecontrol").addClass("mm-hidden");
	$(".stopcontrol").addClass("mm-hidden");

	selectedFrom = "";
	setToRename = "";

	render();

}

disconnectConnection = function(from, to){

	disconnectDevices(from, to, function(){
		loadMidiDevices(function(midiDevices){
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

/* RENDER   ----------------------------------------------- */

renderDeviceButtons = function(){

	$("#fromdevices").empty();
	$("#todevices").empty();

	$.each(APP_STATE.APP_CONNECTIONS.alsaDevices, function(alsaDeviceID, alsaDevice){

		var showClient = showClientID && showClientID == 1;

		hideOutput = false;
		hideInput = false;
		classs = "mm-but mm-but-connection";
		classs += " uc " + unitColors[alsaDevice.alsaDeviceName];

		if (alsaDevice.alsaDeviceNameID.indexOf("in_") > -1) {
			hideOutput = true;
			classs = "mm-but mm-but-filter";
		} else if (alsaDevice.alsaDeviceNameID.indexOf("out_") > -1) {
			hideInput = true;
			classs = "mm-but mm-but-filter";
		}
			
  		outputName = translatedName(alsaDevice.alsaDeviceName, "outputName", alsaDevice.alsaClientName);
  		inputName = translatedName(alsaDevice.alsaDeviceName, "inputName", alsaDevice.alsaClientName);

  		if (showClient) {
  			outputname += alsaDevice.alsaDeviceID;
  			inputName += alsaDevice.alsaDeviceID;
  		}

		inputClass  = (alsaDevice.alsaDeviceIO.indexOf("I") > -1 && hideInput == false) ? classs : "mm-but-disabled";
		outputClass = (alsaDevice.alsaDeviceIO.indexOf("O") > -1 && hideOutput == false) ? classs : "mm-but-disabled";

		output = '<input title="' + alsaDevice.alsaClientName + " " + outputName + ", " + alsaDevice.alsaDeviceID + '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID + '\')" class="setfrom '  + outputClass + '" id="setto' + alsaDeviceID.replace(":","_")  + '" onclick="setFrom(\'' + alsaDeviceID + '\')" value="' + outputName + '"/>';	
		input = '<input title="' + alsaDevice.alsaClientName + " " + outputName + ", " + alsaDevice.alsaDeviceID + '" type="button" onmouseup="holdRenameRelease()" onmousedown="holdToRename(\'' + alsaDeviceID + '\')" class="setto ' + inputClass + '" id="setfrom'  + alsaDeviceID.replace(":","_")  + '" onclick="setTo(\'' + alsaDeviceID + '\')" value="' + inputName + '"/>';

		$("#fromdevices").append($(output));			 				
		$("#todevices").append($(input));

	});
	 
	var refreshButton = $('<input type="button" class="mm-but mm-but-function" id="refrfeshwin" onclick="window.location.href=\'http://' + ip + '\'" value="Refresh"/>'); 		
	var hardresetButton = $('<input type="button" class="mm-but mm-but-function" id="hardreset" onclick="hardReset()" value="Reset"/>'); 
	var rebootButton = $('<input type="button" class="mm-but mm-but-function" id="reboot" onclick="reboot()" value="Boot"/>'); 
	var shutdownButton = $('<input type="button" class="mm-but mm-but-function" id="shutdown" onclick="shutdown()" value="Shutdown"/>'); 
	var foot1Button = $('<input type="button" class="mm-but mm-but-foot" id="cfoot1" onclick="setFrom(\'foot1\')" value="Custom1"/>'); 
	var foot2Button = $('<input type="button" class="mm-but mm-but-foot" id="cfoot2" onclick="setFrom(\'foot2\')" value="Custom2"/>'); 

	$("#foooter").empty();
	$("#foooter").append(refreshButton);
	$("#foooter").append(hardresetButton);
	$("#foooter").append(rebootButton);
	$("#foooter").append(shutdownButton);
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
  		$table.append("<td><input title='" + translatedName(connection.from.alsaDeviceName,"outputName") + ', ' + connection.from.alsaDeviceID + "' type='button' class='" + oclasss + "' value='" + translatedName(connection.from.alsaDeviceName,"outputName") + "'></td>")
  		$table.append("<td><input onclick='setToScript(\"" + connection.connectionUID + "\")' type='button' class='mm-but mm-but-action' value='DISCO'></td>")
  		$table.append("<td><input title='" + translatedName(connection.to.alsaDeviceName,"inputName") + ', ' + connection.to.alsaDeviceID + "' type='button' class='" + iclasss + "' value='" + translatedName(connection.to.alsaDeviceName,"inputName") + "'></td>")
  		$table.append("</tr>");

	});

	/* Render Feet */

	if (APP_STATE.APP_SETTINGS && APP_STATE.APP_SETTINGS.feet)
	for (var a=0;a<APP_STATE.APP_SETTINGS.feet.length;a++){

		classs = "mm-but mm-but-foot";

  		$table.append("<tr>");
  		$table.append("<td><input type='button' class='" + classs + "' value='" + APP_STATE.APP_SETTINGS.feet[a].foot + "'></td>")
  		$table.append("<td><input onclick='dropFoot(\"" + outputName + "\")' type='button' class='mm-but mm-but-action' value='DISC'></td>")
  		$table.append("<td><input type='button' class='" + classs + "' value='" +  APP_STATE.APP_SETTINGS.feet[a].alsaDeviceID + "'></td>")
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

		$("#nrpn_controller").val(fn.f4.co);
		$("#nrpn_value").val(fn.f4.va);
		$("#nrpn_channel").val(fn.f4.ch);
	}

	$(".footer-div").append("<div class='flex-container'>");

	for (s=0;s<APP_STATE.APP_SCRIPTS.length;s++){
		$(".footer-div").append("<input type='button' onclick='setFromScript(\"" + s + "\")' id='script" + s + "' class='mm-but mm-but-filter' value='" + APP_STATE.APP_SCRIPTS[s].title  + "'>");
	}

	$("#foooter").append("<input type='button' onclick='startScript(\"" + s + "\")' id='scriptstart' class='mm-but mm-but-script mm-hidden foo' value='" + "Start"  + "'>");
	$(".footer-div").append("</div>");

	/* Patches  */

	$(".footer-div").append("<div class='flex-container'>");

	$.each(APP_STATE.APP_PATCHES, function(key,obj){
		isSelected = key == currentPatchIdx ? " [!]" : "";

		if (obj.toString() != "TEMP.json")
		$(".footer-div").append("<input onclick='loadPatch(\"" + key + "\")' type='button' class='mm-but mm-but-script' value='" + obj.toString().replace('.json','') + isSelected  + "'>");
	});	

	$(".footer-div").append("</div>");


	goConfig = function(){

		saveAppTemp(APP_STATE, function(){
			window.location='/config.html?currentPatchIdx=' + currentPatchIdx;
		});
		
	}

	/* Save Settings */

	$("#foooter").append('<input type=button class="mm-but mm-but-connection foo" style="cursor:pointer" onclick="goConfig()" id="config" value="CONFIG">');
	$("#foooter").append('<input class="mm-but mm-but-script mm-txt foo foooter-but" type="text" id="filename" value="">');
	$("#foooter").append('<input class="mm-but mm-but-script foo" type=button id="saveSettings" value="Save">');
	$("#foooter").append('<input class="mm-but mm-but-script foo" type=button id="deleteSettings" value="Delete">');
	$("#foooter").append('');

	$("#saveSettings").on("click", function(){
		savePatch();
	});

	$("#deleteSettings").on("click", function(){
		deletePatch();
	});

}

/* Misc -------------------------------------------------- */

hardReset = function(callback){

	pleaseWait();

	$.ajax({
	  	type: "POST",
	  	url: "api/hardreset",	  	
	  	data: {},
	  	success: function(data){
	  		setTimeout(function(){
	  			window.location.reload();
	  			if (callback) callback();
	  		},1500);
	  	}, 
	  	error: function(data){}
	});

}

doUpload = function(){

	t = $("#uploaderText").val();
	fn = $("#uploaderFileName").val();
	
	data = { fileName: fn, fileText: t }

    $.ajax({
      url: 'api/uploaddatatofile', 
      type: 'POST',
      data: data                  
    }).done(function(uploadResult){
        refresh(function(){
			render();
		});
    }).fail(function(){
      console.log("An error occurred, the files couldn't be sent!");
    });	

}

stopFilter2 = function(){

	pleaseWait();
	cancelRename();

	pid = Number(selectedPID);

	stopFilterFile({pid:pid}, function(){
		refresh(function(){
			render();
		});
	});
	
}

holdRenameRelease = function(){

	clearTimeout(holdRenameTimer);

}

holdToRename = function(realA){

	holdRenameTimer = setTimeout(function(){


		isFilter = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaClientIsFilter
		selectedPID = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaClientPID;
		selectedName = APP_STATE.APP_CONNECTIONS.alsaDevices[realA].alsaDeviceName;

		outputName = translatedName(selectedName,"outputName");
  		inputName = translatedName(selectedName,"inputName");

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

pleaseWait = function(){

	$("#pleaseWait").removeClass("mm-hidden");

}

thankYou = function(){

    $("#pleaseWait").addClass("mm-hidden");

}

cancelRename = function(){

	$(".renamecontrol").addClass("mm-hidden");
	$(".stopcontrol").addClass("mm-hidden");
	$(".setfrom").removeClass("mm-but-selected");

}

dropFoot = function(foot){

	for (var a=0;a<APP_STATE.APP_SETTINGS.feet.length;a++){
		if (APP_STATE.APP_SETTINGS.feet.foot == foot){
			spl = a;
		}
	}

	APP_STATE.APP_SETTINGS.feet.splice(a-1,1);
	renderConnections();

}

printer = function(msg){
	if($("#printermessages").children().length > 20) $("#printermessages").children().last().remove();
	$("#printermessages").prepend("<div style='display:block'>" + msg + "</div>");
	console.log(msg);

}

blink = function(control, time){

	$("#" + control).addClass("red");

	setTimeout(function(){
		$("#" + control).removeClass("red");

	},time);

}

/* STARTUP   ----------------------------------------------------- */

$(document).ready(function(){

	/* Init Socket Functions */

	var socket = io.connect(ip);

	socket.on("foot-pedal-1", function(msg) {
		
		blink("foot1_fire", 250);

		if (semf == null) {
			sendFoot('foot1');
			semf = "block";
			setTimeout(function(){
				semf = null;
			},500);
		}

	});

	socket.on("foot-pedal-2", function(msg) {

		blink("foot2_fire", 250);
		
		if (semf == null) {
			sendFoot('foot2');
			semf = "block";
			setTimeout(function(){
				semf = null;
			},500);
		}

	});

	socket.on("printer", function(msg, d) {

		printer(msg);

	});

	socket.on("usb-update", function(msg, d) {
		refresh(function(){
			render();
		});
	
	});

	socket.on("goto-next", function() {

		if (APP_STATE.APP_PATCHES.length > currentPatchIdx) {
			currentPatchIdx++;
			refresh(function(){
				render();
			});
		}

	});

	socket.on("goto-prev", function() {

		if (currentPatchIdx > 0) {
			currentPatchIdx--;
			refresh(function(){
				render();
			});
		}

	});

	socket.on("goto-num", function(num) {

		if (APP_STATE.APP_PATCHES[num]) {
			currentPatchIdx = num;	
			refresh(function(){
				render();
			});
		}

	});


	/* Init WebMidi */

	if (WEB_MIDI == 1)
	WebMidi.enable(function (err) {

		if (err) {
			console.log("WebMidi could not be enabled.", err);
		} else {
			console.log("WebMidi could not not be enabled.");
		}

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

	});		


	/* Init Customs */

	var sendFoot = function(sid){
		
		if ($(".footfoot").is(":checked")){

			var nm;

			event = $("#" + sid + "_event").val();
			controller = Number($("#" + sid + "_controller").val());
			value = Number($("#" + sid + "_value").val());
			f1_evalue = Number($("#foot1_eventvalue").val());
			f2_evalue = Number($("#foot2_eventvalue").val());

			if (APP_STATE.APP_SETTINGS.feet)
			for (a=0;a<APP_STATE.APP_SETTINGS.feet.length;a++){
				if (APP_STATE.APP_SETTINGS.feet[a].foot == sid){
					nm = APP_STATE.APP_SETTINGS.feet[a].alsaDeviceNameID;
				}
			}

			if (event != ""){

				if (event == "pc" && sid == "foot1" && f1_evalue > 0) {
					$("#foot1_eventvalue").val(f1_evalue-1);
					$("#foot2_eventvalue").val(f2_evalue-1);
				} else if (event == "pc" && sid == "foot2" && f1_evalue < 128) {
					$("#foot1_eventvalue").val(f1_evalue+1);
					$("#foot2_eventvalue").val(f2_evalue+1);
				}

				eventvalue = Number($("#" + sid + "_eventvalue").val());
				ccString = "dev \"" + nm + '\" ' + event + " " + eventvalue;

			} else {
				ccString = "dev \"" + nm + '\" cc ' + controller + " " + value;
			}

			if(nm) sendMidi(ccString, function(printthis){
				printer(printthis);
			});

		} else if ($(".footpn").is(":checked")){

			if (sid == "foot1"){
				if (currentPatchIdx > 0) {
					currentPatchIdx--;
					refresh(function(){
						render();
					});
				}
			} 
			else if (sid == "foot2"){
				if (APP_STATE.APP_PATCHES.length > currentPatchIdx) {
					currentPatchIdx++;
					refresh(function(){
						render();
					});

				}
			}

		}

	}

	$("#foot1_fire").on("click", function(){

		sendFoot('foot1');

	});

	$("#foot2_fire").on("click", function(){

		sendFoot('foot2');

	});

	$("#checkShowSendMidi").on("change", function(e){

		c = $("#checkShowSendMidi").is(":checked");

		if (c == true){
			$("#sendMidiSpan").removeClass("mm-hidden");
		} else {
			$("#sendMidiSpan").addClass("mm-hidden");
		}
	
	});

	$("#checkShowUploader").on("change", function(e){

		c = $("#checkShowUploader").is(":checked");

		if (c == true){
			$(".uploader").removeClass("mm-hidden");
		} else {
			$(".uploader").addClass("mm-hidden");
		}
	
	});

	$(".footcb").on("click", function(t){

		$(".footcb").not(this).prop("checked",false);

	});


	/* Refresh-Only if coming from config */ 

	showClientID = $.urlParam('showClientID');

	cpi = $.urlParam('currentPatchIdx');
	
	if (cpi & cpi != 0){

		currentPatchIdx = cpi;

		loadAppTemp(function(state){
			APP_STATE = state;
			render();
		});

	} else {

		refresh(function(){
			render();
		});		

	}

});