
const EVENTS = [
	{ "title":"NOTEON", "description":"Note-on event" },
	{ "title":"NOTEOFF", "description":"Note-off event" },
	{ "title":"CTRL", "description":"Control change event" },
	{ "title":"PROGRAM", "description":"Program change event" },
	{ "title":"PITCHBEND", "description":"Pitchbend event" },
	{ "title":"AFTERTOUCH", "description":"Channel aftertouch event" },
	{ "title":"POLY_AFTERTOUCH", "description":"Polyphonic aftertouch event" },
	{ "title":"SYSEX", "description":"System exclusive event" },
	{ "title":"SYSCM_QFRAME", "description":"MTC quarter frame" },
	{ "title":"SYSCM_SONGPOS", "description":"Song position pointer" },
	{ "title":"SYSCM_SONGSEL", "description":"Song select" },
	{ "title":"SYSCM_TUNEREQ", "description":"Tune request" },
	{ "title":"SYSRT_CLOCK", "description":"Timing clock" },
	{ "title":"SYSRT_START", "description":"Start sequence" },
	{ "title":"SYSRT_CONTINUE", "description":"Continue sequence" },
	{ "title":"SYSRT_STOP", "description":"Stop sequence" },
	{ "title":"SYSRT_SENSING", "description":"Active sensing" },
	{ "title":"SYSRT_RESET", "description":"System reset" }
]

var UNITS=[];
var scripts = [];
var selectedScriptID = -1;
var scriptSteps = [];
var selectedScriptStep = {};
var configHtml = "";

function findUnit(title){

	for (var i=0; i<UNITS.length; i++){
		if (UNITS[i].title == title){
			return UNITS[i];
		}
	}

	return false;

}

function findEvent(title){

	for (var i=0; i<EVENTS.length; i++){
		if (EVENTS[i].title == title){
			return EVENTS[i];
		}
	}

	return false;

}

function unitDefinitionClick(target){

	if (selectedScriptID > -1){

		targetName = $(target).attr('id');
		unitClone = JSON.parse(JSON.stringify(findUnit(targetName)));
		
		if (!scripts[selectedScriptID].units) scripts[selectedScriptID].units = {}

		scripts[selectedScriptID].units.push(unitClone);
		configureUnit(scripts[selectedScriptID].units.length-1)
		renderscripts();
	} else {

		console.log("select script");

	}

}

function eventCheckboxClick(that, unitIdx){
	
	unit = scripts[selectedScriptID].units[unitIdx];

	if (!unit.paramsValues) unit.paramsValues = [];

	if (unit.paramsValues.includes(that.id)){
  		unit.paramsValues.splice(unit.paramsValues.indexOf(that.id), 1);
	} else {
		unit.paramsValues.push(that.id);
	}

}

function configureUnitClick(unitIdx){

	configHtml = configureUnit(unitIdx);
	renderscripts();

}

function configureUnit(unitIdx){

	if (selectedScriptID > -1) {

		unit = scripts[selectedScriptID].units[unitIdx];

		configHtml = "<div style='margin:15px'>";

		if (unit){

			if (unit.paramsType == "EVENT" ){

				for (e=0;e<EVENTS.length;e++){

					if (!unit.paramsValues || unit.paramsValues.length == 0){
						checked = "";
					} else {
						checked = unit.paramsValues.includes(EVENTS[e].title) ?  "checked" : "";
					}
					
					configHtml += "<label style='word-wrap:break-word'><input " + checked + " type='checkbox' onclick='eventCheckboxClick(this," + unitIdx + ")'  id='" + EVENTS[e].title + "'>" + EVENTS[e].title + "</label>" ;
				}	

			} 
			else if ( unit.paramsType == "DATA" ){

				configHtml += "<textarea onkeyup='genericTextboxKeyUp(this," + unitIdx + ")' id='sysex" + EVENTS[e].title + "' class='sysexdata' placeholder='Data'></textarea>";
			}
			else{

				render = "";
				
				if (unit.params)
				for (p=0;p<unit.params.length;p++){

					if (unit.objects && unit.objects[unit.params[p]]) uObj =  unit.objects[unit.params[p]]; else uObj = "";

					render += "<input value='" + uObj + "' onkeyup='genericTextboxKeyUp(this," + unitIdx + ")' class='unitInput' type='text' placeholder='" + unit.params[p] + "' id='" + unit.params[p] + "'>";
					configHtml = render;
				}
			}

			return configHtml + "</div>";
		}
		
		return null;
	}

}

function removeUnit(unitIdx){

	if (selectedScriptID > -1) {
		scripts[selectedScriptID].units.splice(unitIdx,1);
		configHtml = "";
		renderscripts();
	}
	
}

function reverseUnit(unitIdx){

	unitIdx = Number(unitIdx);

	if (selectedScriptID > -1) {

		if(!scripts[selectedScriptID].units[unitIdx].reversed)
			scripts[selectedScriptID].units[unitIdx].reversed = true;
		else
			scripts[selectedScriptID].units[unitIdx].reversed = !scripts[selectedScriptID].units[unitIdx].reversed;

		renderscripts();
	}
	
}

function genericTextboxKeyUp(that, unitIdx){

	unit = scripts[selectedScriptID].units[unitIdx];

	tbId = $(that).attr('id');
	tbVal = $(that).val();

	if (!unit.objects) unit.objects = {}

	unit.objects[tbId] = tbVal;

}

function parseScriptsDefinition(){

	fileName = "";

	for (ss=0;ss<scripts.length;ss++){

		script = scripts[ss];
		units = script.units;
		incomplete = false;

		scriptString = "";
		fileName = script.title;
		fileStringHead = "from mididings import *" + "\n\n" + "config(client_name = '" + fileName + "_mididings')" + "\n\n" + "mypatch = (\n\n"
		fileStringTail = ")" + "\n\n" + "run(mypatch)";

		if (units && units.length > 0){

			for (st=0;st<units.length;st++){
				unit = units[st];

				functionCall = unit.paramsMask;
				
				reverser = (unit.reversed == "true" || unit.reversed == true) ? "~" : "";

				if (unit.params){
					for (parm=0;parm<unit.params.length;parm++){
						parmName = unit.params[parm];	
						if (unit.paramsType == 'EVENT') {
							if (unit.paramsValues.length == 0){
								incomplete = true;
							} else {
								functionCall = reverser + functionCall.replace('{' + parm + '}', unit.paramsValues.toString());
							}
						} else {
							if (unit.objects && unit.objects[parmName]){
								functionCall = reverser + functionCall.replace('{' + parm + '}', unit.objects[parmName]);
							} else {
								incomplete = true;
							}
						}
					}
				} 

				if (units.length > st+1) op = " >> "; else op = "";
				scriptString += "\t\t" + functionCall.trim() + op + "\n";

			}

			fileString = fileStringHead + scriptString + fileStringTail;
			saveObj = { fileName: fileName, fileScript: fileString }

			if (!incomplete){
				saveScriptFile(saveObj);
				$("#script-text").append(fileName + " saved | ");				
			} else {
				$("#script-text").append(fileName + " INCOMPLETE | ");	
			}

		}
	}

}

function addScript(){

	scripts.push({ title: 'NewScript', units: [ ]});
	renderscripts();

}

function selectScript(scriptID){

	selectedScriptID = scriptID;
	configHtml = "";
	
	renderscripts();
	$('.titleInput').blur();

}

function deleteScript(scriptID){
	scripts.splice(scriptID,1);
	renderscripts();

}

function titleKeyUp(that){

	scripts[selectedScriptID].title = $(that).val();

}

function renderUnitDefinitions(){

	for (unit=0;unit<UNITS.length;unit++){
		$("#unit-definition-list").append("<div id='" +  UNITS[unit].title + "' onclick='unitDefinitionClick(this)' class='mm-but mm-but-short mm-but-script'>" + UNITS[unit].title + "</div>");
	}

	$("#unit-definition-list").append("<br><br><div id='addscript' onclick='addScript()' class='mm-but  mm-but-short mm-but-function'>++</div>");
	$("#unit-definition-list").append("<div id='parsescript' onclick='parseScriptsDefinition()' class='mm-but mm-but-short mm-but-function'>PARSE</div>");
	$("#unit-definition-list").append("<div id='savescript' onclick='saveScriptsDefinition()' class='mm-but mm-but-short mm-but-function'>SAVE</div>");
	$("#unit-definition-list").append("<a href='/' class='mm-but mm-but-short mm-but-connection'>SCENE</a>");

}

function renderscripts(){

	$("#scripts-container").empty();

	for (ss=0;ss<scripts.length;ss++){

		bgclass = ss == selectedScriptID ? "script-bggray" : "script-bggold";

		units = scripts[ss].units;
		stepsHtml = "";
		config = "";

		if (units){
			if (units.length > 0) stepsHtml += "<div  class='script-sourcedestination'>SRC</div>";

			for (st=0;st<units.length;st++){
				clas = units[st].reversed && (units[st].reversed == true || units[st].reversed == "true") ? "script-step-reversed" : "script-step";

				if (clas == "script-step-reversed") stepsHtml += "<div class='script-operator-reversed'>~</div>"

				stepsHtml += "<div onclick='configureUnitClick(" + st + ")' class='script-step'>" + units[st].title + "&nbsp;&nbsp;<a onclick='removeUnit(\"" + st + "\")' class='remover'>Remove</a>&nbsp;|&nbsp;<a onclick='reverseUnit(\"" + st + "\")' class='remover'>Reverse</a>" + "</div>"
				stepsHtml += "<div class='script-operator'>>></div>"
				config = ss == selectedScriptID ? configHtml : "";
			}

			if (units.length > 0) stepsHtml += "<div class='script-sourcedestination'>DST</div>";

			if (ss == selectedScriptID){
				title = "<input class='titleInput' type='text' onkeyup='titleKeyUp(this)' id='script" + ss + "title' value='" + scripts[ss].title + "'>";
			} else {
				title = scripts[ss].title + "<a onclick='selectScript(" + ss + ")'>&nbsp;&nbsp;&nbsp;<span style='font-size:11px!important;font-weight:normal'>[Select]</span></a>" + "<a onclick='deleteScript(" + ss + ")'>&nbsp;&nbsp;<span style='font-size:11px!important;font-weight:normal'>[Delete]</span></a>";
			}

			$("#scripts-container").append("<div class='script " + bgclass + "'>" + "<div style='font-size:14px;font-weight:bold'>" + title + "</div>" + stepsHtml + "<br>" + config + "</div>");
		}
	}

}

ajaxPost('api/loadscriptsdefsandunits', null, function(obj){
	UNITS = obj.units;
	scripts = obj.scriptDefs;

	renderUnitDefinitions();
	renderscripts();
});

