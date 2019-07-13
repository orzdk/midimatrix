function loadScriptDefinitions(callback){

	$.ajax({
	  	type: "POST",
	  	url: "api/loadscriptdefinitions",	  	
	  	data: { },
	  	success: function(data){
	  		scripts = data;
	  		if (callback) callback(data);
	  	}, 
	  	error: function(errr){
	  		if (callback) callback(errr);
	  	}
	});

}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.search);
    return (results !== null) ? results[1] || 0 : false;
}

