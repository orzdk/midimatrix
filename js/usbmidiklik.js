
var ip = "192.168.0.23:7001";
var routeTable = {};

printer = (msg, type) => {
	$("#" + type).append(msg);
}

bGetRoutingInfo = () => {
	ajaxPost('api/getRoutingInfo',{},()=>{});	
}

bBackToMidiMode = () => {
	ajaxPost('api/backtomidimode',{},()=>{});
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

createSysExOnCheckboxClick = (row) => {
	sourceType = row < 4 ? "00" : "01";
	id = row > 3 ? "0" + String(row - 4) : "0" + String(row);

	filterFilterMask = filterMask(row, 0, routeTable.filters);
	cableFilterMask = filterMask(row, 0, routeTable.routes);
	jackFilterMask = filterMask(row, 4, routeTable.routes);

	sysEx = "F0 77 77 78 01 " + sourceType + " " + id + " " + filterFilterMask + " " + cableFilterMask + " " + jackFilterMask + " " + "F7";
	
	return sysEx;
}

checkClick = (row,col,event) => {
	if (event.target.id.substring(0,1) == 'r'){
		routeTable.routes[row][col] = routeTable.routes[row][col] == 0 ? 1 : 0;
	} else if (event.target.id.substring(0,1) == 'f'){
		routeTable.filters[row][col] = routeTable.filters[row][col] == 0 ? 1 : 0;
	}

	sysex = createSysExOnCheckboxClick(row);
	$("#serialCharToSend").val(sysex);
	//sendSysEx(sysex);
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

	socket.on("midiklik_message", (msg, d) => {
		printer(msg,"midiklik_message");
	});

	socket.on("midiklik_routes", (routeMsg, d) => {

		if (routeMsg.routes.length > 0 && routeMsg.filters.length > 0){
			routeTable = routeMsg;
			renderCheckboxes(routeMsg.routes, "#routeTableContainer", 8, 8, "route", "r");
			renderCheckboxes(routeMsg.filters, "#filterTableContainer", 8, 4, "filter", "f");
		}
	});

});



