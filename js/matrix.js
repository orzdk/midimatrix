
var outputDevices = [];
var inputDevices = [];

var outputDevicesObj = {};
var inputDevicesObj = {};

ajaxPost('api/getsystemstate', {}, function(APP_STATE){

    console.log(APP_STATE);

    var w = 960, h = 500;
    var labelDistance = 0;
    var vis = d3.select("body").append("svg:svg").attr("width", w).attr("height", h);
    var nodes = [];
    var labelAnchors = [];
    var labelAnchorLinks = [];
    var links = [];
         
    var inputIdx = 0;
    var outputIdx = 0;

    $.each(APP_STATE.APP_CONNECTIONS.alsaDevices, function(alsaDeviceID, alsaDevice){
       
        if (alsaDevice.alsaDeviceIO.indexOf("I") > -1){

                inputDevicesObj[alsaDevice.alsaDeviceClientName] = inputIdx;
                inputIdx++;

                var node = {
                    label : alsaDevice.alsaDeviceClientName,
                    color: "darkred"

                };
                nodes.push(node);
                labelAnchors.push({
                    node : node

                });
                labelAnchors.push({
                    node : node
                });

        }

        if (alsaDevice.alsaDeviceIO.indexOf("O") > -1){

                outputDevicesObj[alsaDevice.alsaDeviceClientName] = outputIdx;
                outputIdx++;

                var node = {
                    label : alsaDevice.alsaDeviceClientName,
                    color: "darkgreen"

                };
                nodes.push(node);
                labelAnchors.push({
                    node : node

                });
                labelAnchors.push({
                    node : node
                });

        }

                               
    });

    // $.each(APP_STATE.APP_CONNECTIONS.alsaDeviceConnections, function(alsaDeviceID, alsaDeviceConnection){

    //     indexOfSource = outputDevicesObj[alsaDeviceConnection.from.alsaDeviceClientName];
    //     indexOfTarget = inputDevicesObj[alsaDeviceConnection.to.alsaDeviceClientName];

    //     links.push({
    //         source : indexOfSource,
    //         target : indexOfTarget,
    //         weight : 1
    //     });



    // });



            // for(var i = 0; i < 30; i++) {
            //     var node = {
            //         label : "node " + i
            //     };
            //     nodes.push(node);
            //     labelAnchors.push({
            //         node : node
            //     });
            //     labelAnchors.push({
            //         node : node
            //     });
            // };

            // for(var i = 0; i < nodes.length; i++) {



            //     labelAnchorLinks.push({
            //         source : i * 2,
            //         target : i * 2 + 1,
            //         weight : 1
            //     });
                
            // };

            // for(var i = 0; i < nodes.length; i++) {

            //     for(var j = 0; j < i; j++) {
            //         if(Math.random() > .95)
            //             links.push({
            //                 source : i,
            //                 target : j,
            //                 weight : Math.random()
            //             });
            //     }

            //     labelAnchorLinks.push({
            //         source : i * 2,
            //         target : i * 2 + 1,
            //         weight : 1
            //     });

            // };

            console.log(nodes);
            console.log(links);
            console.log(JSON.stringify(labelAnchorLinks));

            var force = d3.layout
                .force()
                .size([w, h])
                .nodes(nodes)
                .links(links)
                .gravity(1)
                .linkDistance(50)
                .charge(-3000)
                .linkStrength(function(x) { return x.weight * 10 });

            force.start();

            var force2 = d3.layout
                .force()
                .nodes(labelAnchors)
                .links(labelAnchorLinks)
                .gravity(0)
                .linkDistance(0)
                .linkStrength(8)
                .charge(-100)
                .size([w, h]);

            force2.start();

            var link = vis.selectAll("line.link").data(links).enter().append("svg:line").attr("class", "link").style("stroke", "#000");

            var node = vis.selectAll("g.node")
            .data(force.nodes())
            .enter()
            .append("svg:g")
            .style("fill", function(d){ return d.color });
 
            node.append("svg:circle")
            .attr("r", 5)
            .style("fill", "#FFF")
            .style("stroke", function(d){ return d.color })
            .style("stroke-width", 3);
 
            node.call(force.drag);


            var anchorLink = vis.selectAll("line.anchorLink").data(labelAnchorLinks)//.enter().append("svg:line").attr("class", "anchorLink").style("stroke", "#999");

            var anchorNode = vis.selectAll("g.anchorNode").data(force2.nodes()).enter().append("svg:g").attr("class", "anchorNode");
            
            anchorNode.append("svg:circle").attr("r", 0).style("fill", "#FFF");
            
            anchorNode.append("svg:text").text(function(d, i) {
                return i % 2 == 0 ? "" : d.node.label
            }).style("fill", "#555").style("font-family", "Arial").style("font-size", 12);


            var updateLink = function() {
                this.attr("x1", function(d) {
                    return d.source.x;
                }).attr("y1", function(d) {
                    return d.source.y;
                }).attr("x2", function(d) {
                    return d.target.x;
                }).attr("y2", function(d) {
                    return d.target.y;
                });

            }

            var updateNode = function() {
                this.attr("transform", function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            }

            force.on("tick", function() {

                force2.start();

                node.call(updateNode);

                anchorNode.each(function(d, i) {
                    if(i % 2 == 0) {
                        d.x = d.node.x;
                        d.y = d.node.y;
                    } else {
                        var b = this.childNodes[1].getBBox();

                        var diffX = d.x - d.node.x;
                        var diffY = d.y - d.node.y;

                        var dist = Math.sqrt(diffX * diffX + diffY * diffY);

                        var shiftX = b.width * (diffX - dist) / (dist * 2);
                        shiftX = Math.max(-b.width, Math.min(0, shiftX));
                        var shiftY = 5;
                        this.childNodes[1].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
                    }
                });


                anchorNode.call(updateNode);

                link.call(updateLink);
                anchorLink.call(updateLink);

            });




});




