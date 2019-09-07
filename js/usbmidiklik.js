
//F0 77 77 78 <sysex function id > <data> F7
//INTERNAL SYSEX ARE ONLY INTERPRETED ON CABLE 0 OR MIDI IN JACK 1.
// b0 = channel Voice    (0001)
// b1 = system Common    (0010)
// b2 = realTime         (0100)
// b3 = system exlcusive (1000)

var ip = "192.168.0.16:7000";

var sysex = {
	hardwareReset: "F0 77 77 78 0A F7",
	serialMode: "F0 77 77 78 08 F7",
	name: "F0 77 77 78 0B {1} F7",

}

var filterMasks = {
	channelVoice: "b0",
	systemCommon: "b1",
	realTime: "b2",
	sysEx: "b3"
}


printer = function(msg){
	$("#midiklik").append(msg);
}

connectSerialMode = function(msg){
	ajaxPost('api/bootmidiklikserialmode',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

bootSerialMode = function(msg){
	ajaxPost('api/bootonly',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

menuChoose = function(msg){
	ajaxPost('api/menuchoose',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}


resetMidiklik = function(msg){
	ajaxPost('api/resetmidiklik',{}, function(midiReply){
		printer(JSON.stringify(midiReply));
	});	
}

$(document).ready(function(){

	var socket = io.connect(ip);

	socket.on("midiklik", function(msg, d) {
		printer(msg);
	});


});