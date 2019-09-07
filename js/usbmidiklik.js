
var ip = "192.168.0.23:7001";

printer = (msg) => {

	$("#midiklik").append(msg);
}

connectSerialMode = () => {
	ajaxPost('api/bootconnectserialmode',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

bootSerialMode = () => {
	ajaxPost('api/bootserialmode',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

menuChoose = () => {
	ajaxPost('api/menuchoose',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

resetMidiklik = () => {
	ajaxPost('api/resetmidiklik',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

getConfig = callback => {
	ajaxPost('api/getconfig',{}, function(midiReply){
		callback(midiReply);
	});	
}

checkClick = (x,y, event) => {

	$("#d"+event.target.id).addClass("dirty");
}

rendercheckboxes = configData => {

	var t = "<table>";
 
	for (i=0;i<12;i++){
		t += "<tr>";    
		for (k=0;k<12;k++){
			checked = configData[i][k].optionValue ? " checked " : ""; 
			t += "<td><div id='db" + k + i + "'><input id='b" + k + i + "' onclick='checkClick(" + k + "," + i + ",event)' type='checkbox'" + checked + "></div></td>";    
		}
		t += "</tr>";
	}
	t += "</table>";

	$("body").append(t);
}

$(document).ready(() => {

	var socket = io.connect(ip);

	socket.on("midiklik", (msg, d) => {
		printer(msg);
	});

	getConfig(data => {
		rendercheckboxes(data.routes);
	});

});