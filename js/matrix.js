
var outputDevices = [];
var inputDevices = [];

ajaxPost('api/getsystemstate', {}, function(APP_STATE){

    $.each(APP_STATE.APP_CONNECTIONS.alsaDevices, function(alsaDeviceID, alsaDevice){
       
        if (alsaDevice.alsaDeviceIO.indexOf("I") > -1){
            inputDevices.push(alsaDevice);
        }

        if (alsaDevice.alsaDeviceIO.indexOf("O") > -1){
            outputDevices.push(alsaDevice);
        }
                                
    });

    $.each(outputDevices, function(id, alsaDevice){
         $("#info1").append("<div class='cube cube-horiz'>" + alsaDevice.alsaDeviceName + "</div");
    });

    $.each(inputDevices, function(id, alsaDevice){
         $("#info2").append("<div class='cube cube-vert'>" + alsaDevice.alsaDeviceName + "</div");
    });


});




