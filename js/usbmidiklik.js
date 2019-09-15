
var routeTable = {};

printer = (msg) => {
	var msgtosend = "";

	if (typeof msg === 'string' || msg instanceof String){
		msgtosend = msg;
	}
	else {
		msgtosend = JSON.stringify(msg);
	}

	$("#midiklik_message").prepend(msgtosend + "\r\n");
}

_requestRouteInfo = () => {

	ajaxPost('api/requestconfiguration',{},()=>{});	
}

_bootToMidiMode = () => {

	ajaxPost('api/boottomidimode',{},()=>{});
}

_bootToSerialMode = () => {

	ajaxPost('api/boottoserialmode',{},()=>{});
}

_sendSerialChar = () => {

	ajaxPost('api/sendserialchar',{char: $("#serialCharToSend").val()},()=>{});
}

_lightUp = () => {

	ajaxPost('api/lightup',{},()=>{});
}

_lightDown = () => {

	ajaxPost('api/lightdown',{},()=>{});
}

_setMidiKlikName = () => {
	
	let name = $("#serialCharToSend").val();
	let nameHex = name.hexEncode().match(/.{1,2}/g).join(" ");
	let sysEx = "F0 77 77 78 0B " + nameHex + " F7";
}

filterMask = (row, offset, lookin) => {

	var bin="";
	for(var i=0;i<4;i++){ bin += String(lookin[row][i+offset]) }
	return "0" + ConvertBase.bin2hex(bin).toString().toUpperCase();
}

createSysExOnCheckboxClick = (row) => {
	sourceType = row < 4 ? "00" : "01";
	id = row > 3 ? "0" + String(row - 4) : "0" + String(row);

	filterFilterMask = filterMask(row, 0, routeTable.filters);
	cableFilterMask = filterMask(row, 0, routeTable.routes);
	jackFilterMask = filterMask(row, 4, routeTable.routes);

	sysEx = "77 77 78 0F 01 " + sourceType + " " + id + " " + filterFilterMask + " " + cableFilterMask + " " + jackFilterMask;
	
	return sysEx;
}

checkClick = (row,col,event) => {


	if (event.target.id.substring(0,1) == 'r'){
		routeTable.routes[row][col] = routeTable.routes[row][col] == 0 ? 1 : 0;
	} else if (event.target.id.substring(0,1) == 'f'){
		routeTable.filters[row][col] = routeTable.filters[row][col] == 0 ? 1 : 0;
	}

	let sysEx = createSysExOnCheckboxClick(row);

	$("#serialCharToSend").val(sysEx);

	ajaxPost('api/sendsysex',{sysex:sysEx},()=>{});
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



