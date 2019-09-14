
var ip = "192.168.0.23:7001";
var routeTable = {};

printer = (msg) => {
	var msgtosend = "";

	if (typeof msg === 'string' || msg instanceof String){
		msgtosend = msg;
	}
	else {
		msgtosend = JSON.stringify(msg);
	}

	$("#midiklik_message").append(msgtosend + "\r\n");
}

bGetRoutingInfo = () => {
	ajaxPost('api/requestconfiguration',{},()=>{});	
}

bBootToMidiMode = () => {
	ajaxPost('api/boottomidimode',{},()=>{});
}

bSendSerialChar = () => {
	ajaxPost('api/sendserialchar',{char: $("#serialCharToSend").val()},()=>{});
}

lightUp = () => {
	ajaxPost('api/lightup',{},()=>{});
}

lightDown = () => {
	ajaxPost('api/lightdown',{},()=>{});
}

sendSysEx = (sysex) => {
	ajaxPost('api/sendsysex',{sysex:sysex},()=>{});
}

filterMask = (row, offset, lookin) => {
	var bin="";
	for(var i=0;i<4;i++){ bin += String(lookin[row][i+offset]) }
	return "0" + ConvertBase.bin2hex(bin).toString().toUpperCase();
}

checkClick = (row,col,event) => {

	createSysExOnCheckboxClick = (row) => {
		sourceType = row < 4 ? "00" : "01";
		id = row > 3 ? "0" + String(row - 4) : "0" + String(row);

		filterFilterMask = filterMask(row, 0, routeTable.filters);
		cableFilterMask = filterMask(row, 0, routeTable.routes);
		jackFilterMask = filterMask(row, 4, routeTable.routes);

		sysEx = "F0 77 77 78 01 " + sourceType + " " + id + " " + filterFilterMask + " " + cableFilterMask + " " + jackFilterMask + " " + "F7";
		
		return sysEx;
	}

	if (event.target.id.substring(0,1) == 'r'){
		routeTable.routes[row][col] = routeTable.routes[row][col] == 0 ? 1 : 0;
	} else if (event.target.id.substring(0,1) == 'f'){
		routeTable.filters[row][col] = routeTable.filters[row][col] == 0 ? 1 : 0;
	}

	sysex = createSysExOnCheckboxClick(row);
	$("#serialCharToSend").val(sysex);
	//sendSysEx(sysex);
}

String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += (hex).slice(-4);
    }

    return result
}

setMidiKlikName = () => {
	
	let name = $("#serialCharToSend").val();

	let nameHex = "67 75 61 70 6f 6d 69 64 69"; // 
	let nh2 = name.hexEncode().match(/.{1,2}/g).join(" ");

	let sysEx = "F0 77 77 78 0B " + nh2 + " F7";

	sendSysEx(sysEx);
}

renderCheckboxes = (rt, renderContainer, rows, cols, type, code) => {

    var t = "";

	for (row=0;row<rows;row++){
		t += "<tr>";    
		for (col=0;col<cols;col++){
			checked = rt[row][col] == 1 ? " checked " : ""; 
			disabled = rt[row][col] ==  null ? " disabled " : ""; 
			divid = code + code + row + col;
			inputid = code + row + col;
			t += "<td><div id='" + divid + "'><input cbtype='" + type + "' id='" + inputid + "' onclick='checkClick(" + row + "," + col + ",event)' type='checkbox'" + checked + disabled + "></div></td>";    
		}
		t += "</tr>";
	}

	$(renderContainer).html("<table>" + t + "</table>");
}

$(document).ready(() => {

	var socket = io.connect(ip);

	socket.on("mk_message", (message, d) => {
		printer(message);

	});

	socket.on("mk_routes", (data, d) => {		
		printer("[data]");

		routeTable = data;
		renderCheckboxes(data.routes, "#routeTableContainer", 8, 8, "route", "r");
		renderCheckboxes(data.filters, "#filterTableContainer", 8, 4, "filter", "f");
	});

});



