
var ip = "192.168.0.23:7001";
var routeTable = [];

printer = (msg) => {

	$("#midiklik").append(msg);
}

getRoutingInfo = () => {

	ajaxPost('api/getRoutingInfo',{},()=>{});	
}

resetMidiKlik = () => {

	ajaxPost('api/resetMidiKlik',{},()=>{});
}

sendSysEx = (sysex) => {

	ajaxPost('api/sendsysex',{sysex:sysex},()=>{});
}

filterMask = (row, offset) => {
	var bin="";
	for(var i=0;i<4;i++){ bin += String(routeTable[row][i+offset]) }
	return "0" + ConvertBase.bin2hex(bin).toString().toUpperCase();
}

createSysExOnClick = (row) => {
	console.log("createSysExOnClick",row);
	sourceType = row < 4 ? "00" : "01";
	id = row > 3 ? "0" + String(row - 4) : "0" + String(row);
	filterFilterMask = filterMask(row,0);
	cableFilterMask = filterMask(row,4);
	jackFilterMask = filterMask(row,8);

	sysEx = "F0 77 77 78 01 " + sourceType + " " + id + " " + filterFilterMask + " " + cableFilterMask + " " + jackFilterMask + " " + "F7";
	console.log(sysEx);
	return sysEx;
}

checkClick = (row,col,event) => {
	routeTable[row][col] = routeTable[row][col] == 0 ? 1 : 0;

	sysex = createSysExOnClick(row)
	sendSysEx(sysex);
	$("#m").val(sysex);
}

renderCheckboxes = () => {

    var t = "";
 
	for (row=0;row<12;row++){
		t += "<tr>";    
		for (col=0;col<12;col++){
			checked = routeTable[row][col] == 1 ? " checked " : ""; 
			disabled = routeTable[row][col] ==  null ? " disabled " : ""; 
			divid = "dd" + row + col;
			inputid = "d" + row + col;
			t += "<td><div id='" + divid + "'><input id='" + inputid + "' onclick='checkClick(" + row + "," + col + ",event)' type='checkbox'" + checked + disabled + "></div></td>";    
		}
		t += "</tr>";
	}

	$("#routeTableContainer").html("<table>" + t + "</table>");
}

$(document).ready(() => {

	var socket = io.connect(ip);

	socket.on("midiklik", (msg, d) => {
		printer(msg);
	});

	socket.on("midiklik_obj", (msg, d) => {
		routeMsg = JSON.parse(msg);
		if (routeMsg.routeTable.length > 0){
			routeTable = routeMsg.routeTable
			renderCheckboxes();
		}
	});


});



