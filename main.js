var currentView = "water-consumption";

if(localStorage.getItem('currentView')) {
    currentView = localStorage.getItem('currentView');
}

var mode = "day";

// Get last mode used from local storage
if(localStorage.getItem('mode')) {
    mode = localStorage.getItem('mode');
}

if(!localStorage.getItem('email')) {
    localStorage.setItem('email','khoa.zany@gmail.com');
}

var fromDate = '';
var fromTime = '';

/*
if(localStorage.getItem('fromDate')) {
    from = localStorage.getItem('fromDate') + ' ' + localStorage.getItem('fromTime');
}
*/

var toDate = '';
var toTime = '';

/*
if(localStorage.getItem('toDate')) {
    from = localStorage.getItem('toDate') + ' ' + localStorage.getItem('toTime');
}
*/

// Change the URL of the channel HERE
var channel1 = "http://api.thingspeak.com/channels/63279";
var channel2 = "http://api.thingspeak.com/channels/64795";

// HARDCODE AVERAGE CONSUMPTION
AVERAGE_CONSUMPTION_DAY = 740000.6111111;
AVERAGE_CONSUMPTION_HOUR = 30000.8587963;
AVERAGE_CONSUMPTION_MINUTE = 5000.514313272;

// Field numbers on ThingSpeak
var fields = [1,2]

// Pre-initiate values
var outputs,pulledData1,pulledData2,heatmapInstance,heatmapData;

$(document).ready(function () {
    prepareHeatmapAndAlert();
    reactToNewView(currentView);
});

function showErrorMessage (message) {
    $('#alert-container').html('');

    $('<div class="alert alert-danger fixedTopElement system-message">' +
      '<button class="close" data-dismiss="alert"' +
      'type="button">&times;</button>' + message + 
      '</div>').hide().prependTo('#alert-container')
    .slideDown('fast')
    .delay(40000)
    .slideUp(function() {
        $(this).remove(); 
    });
}

function showSuccessMessage (message) {
    $('#alert-container').html('');

    $('<div class="alert alert-success fixedTopElement system-message">' +
      '<button class="close" data-dismiss="alert"' +
      'type="button">&times;</button>' + message + 
      '</div>').hide().prependTo('#alert-container')
    .slideDown('fast')
    .delay(40000)
    .slideUp(function() {
        $(this).remove(); 
    });
}

function changeView (newView) {
    currentView = newView;
    localStorage.setItem('currentView',currentView);

    reactToNewView(newView);
}

function reactToNewView (view) {
    /* Remove old alert */
    $('#alert-container').html('');

    /* Change active on sidebar */
    $('a.active').removeClass('active');
    $('#' + view).addClass('active');

    /* Change template */
    $('.content').hide();
    $('#' + view + '-content').show();

    if(view == 'water-consumption') {

        $('#filter-type').val(mode);
        /*
        $('#dateFrom').val(localStorage.getItem('dateForm'));
        $('#timeFrom').val(localStorage.getItem('timeForm'));
        $('#dateTo').val(localStorage.getItem('dateTo'));
        $('#timeTo').val(localStorage.getItem('timeTo'));
        */

        $('#filter-type').change(function () {
            changeMode($(this).val());
        });

        /*
        $('#datetimepickerFrom').change(function () {
            changeFrom($(this).val());
        });

        $('#datetimepickerTo').change(function () {
            changeTo($(this).val());
        });
*/

        //execute(true);
    } else if(view == 'pipe-map') {
        Pace.start();
        generateHeatmapResult();
    } else if(view == 'alerts') {
        generateAlertTable();
    }
}

function changeMode (newMode) {
    mode = newMode;
    localStorage.setItem('mode',mode);
}

function changeFrom (newFromDate,newFromTime) {
    fromDate = newFromDate;
    fromTime = newFromTime;
    localStorage.setItem('newFromDate',newFromDate);
    localStorage.setItem('newFromTime',newFromTime);
}

function changeTo (newToDate,newToTime) {
    toDate = newToDate;
    toTime = newToTime;
    localStorage.setItem('newFromDate',newToDate);
    localStorage.setItem('newToTime',newToTime);
}

function viewChart () {
    changeFrom($('#dateFrom').val(),$('#timeFrom').val());
    changeTo($('#dateTo').val(),$('#timeTo').val());
    execute(false);
}

function refreshData () {
    execute(true);
}

function execute (isRepulled) {
    Pace.start();

    if(isRepulled || !pulledData1) {
        d3.json(channel1 + "/feed.json?api_key=PORD1D24PPO7TB4L&results=8000&timezone=Asia%2FSingapore", 
            function(error1, data1) {
                if (error1) throw error1;

            // Save data
            pulledData1 = data1;

            d3.json(channel2 + "/feed.json?api_key=QCC3G0SI5A5OEUQZ&results=8000&timezone=Asia%2FSingapore", 
                function(error2, data2) {
                    if (error2) throw error2;

                // Save data
                pulledData2 = data2;

                visualize(data1,data2);
                //Pace.stop();
            });
        });
    } else {
        visualize(pulledData1,pulledData2);
    }
}

function visualize (rawData1,rawData2) {
    var margin = {top: 20, right: 80, bottom: 130, left: 50},
    width = 760 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    radius = Math.min(width, height) / 2;

    var donutWidth = 75;
    var legendRectSize = 18;
    var legendSpacing = 4;

    var x = d3.time.scale()
    .range([0, width]);

    var xBar = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
    .range([height, 0]);

    var color = d3.scale.category10();

    var arc = d3.svg.arc()
    .outerRadius(radius - donutWidth)
    .innerRadius(radius);

    var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.value; });

    var d3Format = d3.time.format("%d-%m-%Y");

    if(mode == "hour") {
        d3Format = d3.time.format("%d-%m-%Y %H:00");    
    } else if(mode == "minute") {
        d3Format = d3.time.format("%d-%m-%Y %H:%M");
    } else if(mode == "month") {
        d3Format = d3.time.format("%m-%Y");
    }

    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(d3Format)
    .ticks(d3.time.days, 1);
    if(mode == "hour") {
        xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(d3Format)
        .ticks(d3.time.hours, 1);    
    } else if(mode == "minute") {
        xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(d3Format)
        .ticks(d3.time.minutes, 1);
    }

    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

    var line = d3.svg.line()
    .interpolate("cardinal")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

    var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<strong>Cost:</strong> <span style='color:red'>" + d.value.toFixed(2) + "$</span><br>" +
        "<strong>Time Period:</strong> <span style='color:red'>" + d.date.format(format) + "</span>";
    })

    var transformedData1 = [];
    var transformedData2 = [];
    var transformedDataTotal = [];
    var averageNational = [];
    var totalDataPie1 = 0.01;
    var totalDataPie2 = 0.01;

    var format = "";

    if(mode == "day") {
        format = 'DD-MM-YYYY';
    } else if(mode == "hour") {
        format = 'DD-MM-YYYY HH';
    } else if(mode == "minute") {
        format = 'DD-MM-YYYY HH:mm';
    } else if(mode == "month") {
        format = 'MM-YYYY';
    }

    var from = fromDate;
    if(fromTime != '') {
        if(fromTime[1] == ':') {
            fromTime = '0' + fromTime;
        }
        from += 'T' + fromTime + '+08:00';
    } else {
        from += 'T00:00:00+08:00';
    }
    if(fromDate == '') {
        from = '';
    }

    var to = toDate;
    if(toTime != '') {
        if(toTime[1] == ':') {
            toTime = '0' + toTime;
        }
        to += 'T' + toTime + '+08:00';
    } else {
        to += '23:59:59+08:00';
    }
    console.log(toDate == '');
    if(toDate == '') {
        to = '';
    }

    var fromMoment = moment(from);
    var toMoment = moment(to);
    console.log(fromMoment);
    console.log(toMoment);

    rawData1.feeds.forEach(function(d) {
        d.date = moment(d.created_at);
        //console.log(d.date);
        d.value = parseFloat(d["field1"]);
        //d.value2 = parseFloat(d["field1"]);

        var existed1 = false;
        //var existed2 = false;

        if((from == '' || moment(from) <= d.date) &&
            (to == '' || moment(to) >= d.date)) {

            totalDataPie1 += d.value;

        for (var i = transformedData1.length - 1; i >= 0; i--) {
            if(!existed1 && transformedData1[i].date.format(format) == d.date.format(format)) {
                transformedData1[i].value += d.value;
                existed1 = true;
                break;
            }
        }

            /*
            for (var i = transformedDataTotal.length - 1; i >= 0; i--) {
                if(!existed1 && !existed2 && 
                    transformedDataTotal[i].date.format(format) == d.date.format(format)) {
                    transformedDataTotal[i].value += d.value1 + d.value2;
                    break;
                }
            }

            for (var i = transformedData2.length - 1; i >= 0; i--) {

                if(!existed2 && transformedData2[i].date.format(format) == d.date.format(format)) {
                    transformedData2[i].value += d.value2;
                    existed2 = true;
                    break;
                }
            }
            */

            if(!existed1) {
                transformedData1.push({
                    date: d.date,
                    value: d.value
                });
            }

            /*
            if(!existed2) {
                transformedData2.push({
                    date: d.date,
                    value: d.value2
                });
            }

            if(!existed1 && !existed2) {
                transformedDataTotal.push({
                    date: d.date,
                    value: d.value1 + d.value2
                });
            }
            */
        }
    });

rawData2.feeds.forEach(function(d) {
    d.date = moment(d.created_at);
        //console.log(d.date);
        d.value = parseFloat(d["field1"]);
        //d.value2 = parseFloat(d["field1"]);

        var existed1 = false;
        //var existed2 = false;

        if((from == '' || moment(from) <= d.date) &&
            (to == '' || moment(to) >= d.date)) {

            totalDataPie2 += d.value;

        for (var i = transformedData2.length - 1; i >= 0; i--) {
            if(!existed1 && transformedData2[i].date.format(format) == d.date.format(format)) {
                transformedData2[i].value += d.value;
                existed1 = true;
                break;
            }
        }

            /*
            for (var i = transformedDataTotal.length - 1; i >= 0; i--) {
                if(!existed1 && !existed2 && 
                    transformedDataTotal[i].date.format(format) == d.date.format(format)) {
                    transformedDataTotal[i].value += d.value1 + d.value2;
                    break;
                }
            }

            for (var i = transformedData2.length - 1; i >= 0; i--) {

                if(!existed2 && transformedData2[i].date.format(format) == d.date.format(format)) {
                    transformedData2[i].value += d.value2;
                    existed2 = true;
                    break;
                }
            }
            */

            if(!existed1) {
                transformedData2.push({
                    date: d.date,
                    value: d.value
                });
            }

            /*
            if(!existed2) {
                transformedData2.push({
                    date: d.date,
                    value: d.value2
                });
            }

            if(!existed1 && !existed2) {
                transformedDataTotal.push({
                    date: d.date,
                    value: d.value1 + d.value2
                });
            }
            */
        }
    });

rawData1.feeds.concat(rawData2.feeds).forEach(function(d) {
    d.date = moment(d.created_at);
        //console.log(d.date);
        d.value = parseFloat(d["field1"]);
        //d.value2 = parseFloat(d["field1"]);

        var existed1 = false;
        //var existed2 = false;

        if((from == '' || moment(from) <= d.date) &&
            (to == '' || moment(to) >= d.date)) {

            for (var i = transformedDataTotal.length - 1; i >= 0; i--) {
                if(!existed1 && transformedDataTotal[i].date.format(format) == d.date.format(format)) {
                    transformedDataTotal[i].value += d.value;
                    existed1 = true;
                    break;
                }
            }

            /*
            for (var i = transformedDataTotal.length - 1; i >= 0; i--) {
                if(!existed1 && !existed2 && 
                    transformedDataTotal[i].date.format(format) == d.date.format(format)) {
                    transformedDataTotal[i].value += d.value1 + d.value2;
                    break;
                }
            }

            for (var i = transformedData2.length - 1; i >= 0; i--) {

                if(!existed2 && transformedData2[i].date.format(format) == d.date.format(format)) {
                    transformedData2[i].value += d.value2;
                    existed2 = true;
                    break;
                }
            }
            */

            if(!existed1) {
                transformedDataTotal.push({
                    date: d.date,
                    value: d.value
                });

                if(mode == 'day') {
                    averageNational.push({
                        date: d.date,
                        value: AVERAGE_CONSUMPTION_DAY
                    });
                } else if(mode == 'hour') {
                    averageNational.push({
                        date: d.date,
                        value: AVERAGE_CONSUMPTION_HOUR
                    });
                } else if(mode == 'minute') {
                    averageNational.push({
                        date: d.date,
                        value: AVERAGE_CONSUMPTION_MINUTE
                    });
                }


            }

            /*
            if(!existed2) {
                transformedData2.push({
                    date: d.date,
                    value: d.value2
                });
            }

            if(!existed1 && !existed2) {
                transformedDataTotal.push({
                    date: d.date,
                    value: d.value1 + d.value2
                });
            }
            */
        }
    });

data = transformedData1.concat(transformedData2);

console.log(transformedData1.length);
console.log(transformedData2.length);

if(transformedData1.length > 50 || transformedData2.length > 50) {
    showErrorMessage('Too many data points to show.Please select a smaller period.');
} else {
    outputs = [
    {
        name: "Toilet",
        values: transformedData1
    },
    {
        name: "Kitchen Sink",
        values: transformedData2
    },
    {
        name: "Total",
        values: transformedDataTotal
    }
        /*
        {
            name: "National",
            values: averageNational
        }
        */
        ];

        $('#svg').html('');
        $('#svg-pie').html('');

        var svg = d3.select("#svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        x.domain(d3.extent(data, function(d) { 
            return d.date; 
        }));

        y.domain([
          d3.min(outputs, function(c) { return 0; }),
                  //d3.min(outputs, function(c) { return d3.min(c.values, function(v) { return v.value; }); }),
                  d3.max(outputs, function(c) { return d3.max(c.values, function(v) { return v.value; }); })
                  ]);

        svg.append("g")
        .attr("class", "x axis")
        //.attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "-6.15em")
        .attr("transform", function(d) {
            return "rotate(-65)" 
        });

        svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Consumption (m^3)");

        var thegraph = svg.selectAll(".thegraph")
        .data(outputs);

        //append a g tag for each line and set of tooltip circles and give it a unique ID based on the column name of the data     
        var thegraphEnter=thegraph.enter().append("g")
        .attr("clip-path", "url(#clip)")
        .attr("class", "thegraph")
        .attr('id',function(d){ return d.name+"-line"; })
        .style("stroke-width",2.5)
        .on("mouseover", function (d) {                                  
            d3.select(this)                          //on mouseover of each line, give it a nice thick stroke
            .style("stroke-width",'6px');
            
            var selectthegraphs = $('.thegraph').not(this);     //select all the rest of the lines, except the one you are hovering on and drop their opacity
            d3.selectAll(selectthegraphs)
            .style("opacity",0.2);
            
            var getname = document.getElementById(d.name);    //use get element cause the ID names have spaces in them
            var selectlegend = $('.legend').not(getname);    //grab all the legend items that match the line you are on, except the one you are hovering on

            d3.selectAll(selectlegend)    // drop opacity on other legend names
            .style("opacity",.2);

            d3.select(getname)
                .attr("class", "legend-select");  //change the class on the legend name that corresponds to hovered line to be bolder           
            })
        .on("mouseout", function(d) {        //undo everything on the mouseout
            d3.select(this)
            .style("stroke-width",'2.5px');
            
            var selectthegraphs = $('.thegraph').not(this);
            d3.selectAll(selectthegraphs)
            .style("opacity",1);
            
            var getname = document.getElementById(d.name);
            var getname2= $('.legend[fakeclass="fakelegend"]')
            var selectlegend = $('.legend').not(getname2).not(getname);

            d3.selectAll(selectlegend)
            .style("opacity",1);
            
            d3.select(getname)
            .attr("class", "legend");           
        });

    //actually append the line to the graph
    thegraphEnter.append("path")
    .attr("class", "line")
    .style("stroke", function(d) { return color(d.name); })
    .attr("d", function(d) { 
        if(d.values.length > 0) {
            return line(d.values[0]);
        } else {
            return line(0);
        } 
    })
    .transition()
    .duration(2000)
    .attrTween('d',function (d){
        var interpolate = d3.scale.quantile()
        .domain([0,1])
        .range(d3.range(1, d.values.length+1));
        return function(t){
            return line(d.values.slice(0, interpolate(t)));
        };
    });

    //then append some 'nearly' invisible circles at each data point  
    thegraph.selectAll("circle")
    .data( function(d) {return(d.values);} )
    .enter()
    .append("circle")
    .attr("class","tipcircle")
    .attr("cx", function(d,i){return x(d.date)})
    .attr("cy",function(d,i){return y(d.value)})
    .attr("r",3)
            //.style('opacity', 1e-6)//1e-6
            .attr ("title", maketip);

        //append the legend
        var legend = svg.selectAll('.legend')
        .data(outputs);

        var legendEnter=legend
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('id',function(d){ return d.name; })
        .on('click', function (d) {                           //onclick function to toggle off the lines            
            if($(this).css("opacity") == 1){                  //uses the opacity of the item clicked on to determine whether to turn the line on or off         

                var elemented = document.getElementById(this.id +"-line");   //grab the line that has the same ID as this point along w/ "-line"  use get element cause ID has spaces
                d3.select(elemented)
                .transition()
                .duration(1000)
                .style("opacity",0)
                .style("display",'none');

                d3.select(this)
                .attr('fakeclass', 'fakelegend')
                .transition()
                .duration(1000)
                .style ("opacity", .2);
            } else {

                var elemented = document.getElementById(this.id +"-line");
                d3.select(elemented)
                .style("display", "block")
                .transition()
                .duration(1000)
                .style("opacity",1);

                d3.select(this)
                .attr('fakeclass','legend')
                .transition()
                .duration(1000)
                .style ("opacity", 1);}
            });

    //make an empty variable to stash the last values into so i can sort the legend
    var lastvalues=[];

    //defines a function to be used to append the title to the tooltip.  you can set how you want it to display here.
    var maketip = function (d) {
        console.log(d);                           
        var tip = '<p class="tip1">' + NumbType(d.value) + '</p> <p class="tip3">'+ d.date.format(format) +'</p>';
        return tip;}

    // set the type of number here, n is a number with a comma, .2% will get you a percent, .2f will get you 2 decimal points
    var NumbType = d3.format(".2f");

    //create a scale to pass the legend items through
    var legendscale= d3.scale.ordinal()
    .domain(lastvalues)
    .range([0,30,60,90,120,150,180,210]);

    //actually add the circles to the created legend container
    legendEnter.append('circle')
    .attr('cx', width +20)
    .attr('cy', function(d){
        if(d.values.length > 0) {
            return legendscale(d.values[d.values.length-1].value);
        } else {
            return legendscale(0);
        }
    })
    .attr('r', 7)
    .style('fill', function(d) { 
        return color(d.name);
    });

    //add the legend text
    legendEnter.append('text')
    .attr('x', width+35)
    .attr('y', function(d){
        if(d.values.length > 0) {
            return legendscale(d.values[d.values.length-1].value);
        } else {
            return legendscale(0);
        }
    })
    .text(function(d){ return d.name; });

    // set variable for updating visualization
    var thegraphUpdate = d3.transition(thegraph);
    
    // change values of path and then the circles to those of the new series
    thegraphUpdate.select("path")
    .attr("d", function(d, i) {       

            //must be a better place to put this, but this works for now
            if(d.values.length > 0) {
                lastvalues[i]=d.values[d.values.length-1].value;
            } else {
                lastvalues[i]=0;
            }         
            lastvalues.sort(function (a,b){return b-a});
            legendscale.domain(lastvalues);

            return line(d.values); });

    thegraphUpdate.selectAll("circle")
    .attr ("title", maketip)
    .attr("cy",function(d,i){return y(d.value)})
    .attr("cx", function(d,i){return x(d.date)});


      // and now for legend items
      var legendUpdate=d3.transition(legend);
      
      legendUpdate.select("circle")
      .attr('cy', function(d, i){  
        if(d.values.length > 0) {
            return legendscale(d.values[d.values.length-1].value);
        } else {
            return legendscale(0);
        }
    });

      legendUpdate.select("text")
      .attr('y',  function (d) {
        if(d.values.length > 0) {
            return legendscale(d.values[d.values.length-1].value);
        } else {
            return legendscale(0);
        }
    });


     // update the axes,   
     d3.transition(svg).select(".y.axis")
     .call(yAxis);   

     d3.transition(svg).select(".x.axis")
     .attr("transform", "translate(0," + height + ")")
     .call(xAxis);

    //make my tooltips work
    $('circle').tipsy({opacity:.9, gravity:'n', html:true});

    /*
    thegraph.append("text")
        .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.value) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });
        */

        var pieData = [
        {
            name: "Toilet",
            value: totalDataPie1
        },
        {
            name: "Kitchen Sink",
            value: totalDataPie2
        }
        ]

   // Pie chart code below
   var pieSvg = d3.select("#svg-pie")
   .attr("width", width)
   .attr("height", height)
   .append("g")
   .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

   var g = pieSvg.selectAll(".arc")
   .data(pie(pieData))
   .enter().append("g")
   .attr("class", "arc");

   g.append("path")
   .attr("d", arc)
   .style("fill", function(d) { return color(d.data.name); });

   g.append("text")
   .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
   .attr("dy", ".35em")
   .style("text-anchor", "middle")
   .text(function(d) { return d.data.name; });

   var tooltip = d3.select('#pie-chart')            // NEW 
      .append('div')                             // NEW
      .attr('class', 'tooltip');                 // NEW

    tooltip.append('div')                        // NEW
      .attr('class', 'label');                   // NEW

    tooltip.append('div')                        // NEW
      .attr('class', 'count');                   // NEW

    tooltip.append('div')                        // NEW
    .attr('class', 'percent');  

    g.on('mouseover', function(d) {
      var total = d3.sum(pieData.map(function(d) {
        return d.value;
    }));
      var percent = Math.round(1000 * d.data.value / total) / 10;
      tooltip.select('.label').html(d.data.name);
      tooltip.select('.count').html(d.data.value.toFixed(2)); 
      tooltip.select('.percent').html(percent.toFixed(2) + '%'); 
      tooltip.style('display', 'block');
  });

    g.on('mouseout', function() {
      tooltip.style('display', 'none');
  });

    var pieLegend = pieSvg.selectAll('.legend')
    .data(color.domain())
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', function(d, i) {
      var height = legendRectSize + legendSpacing;
      var offset =  height * color.domain().length / 2;
      var horz = -2 * legendRectSize;
      var vert = i * height - offset;
      return 'translate(' + horz + ',' + vert + ')';
  });

    pieLegend.append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)                                   
    .style('fill', color)
    .style('stroke', color);

    pieLegend.append('text')
    .attr('x', legendRectSize + legendSpacing)
    .attr('y', legendRectSize - legendSpacing)
    .text(function(d) { return d; });

    // Bar chart code below
    var barSvg = d3.select("#svg-bar")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    barSvg.call(tip);

    xBar.domain(transformedDataTotal.map(function(d) { 
        return d.date;
    }));
    y.domain([0, d3.max(transformedDataTotal, function(d) {
        if(d.value < 41) {
            return Math.abs(d.value)*1.1700*1.30;
        } else {
            return Math.abs(d.value)*1.4000*1.45;
        } 
    })]);

    barSvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("transform", function(d) {
        return "rotate(-65)" 
    });

    barSvg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Cost(SGD)");

    barSvg.selectAll(".bar")
    .data(transformedDataTotal)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return xBar(d.date); })
    .attr("width", xBar.rangeBand())
    .attr("y", function(d) { return y(d.value.toFixed(2)); })
    .attr("height", function(d) { return height - y(d.value); })
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)

}
}

function prepareHeatmapAndAlert () {
    console.log("hello");
    //Pace.start();
    // minimal heatmap instance configuration
    heatmapInstance = h337.create({
      // only container is required, the rest will be defaults
      container: document.querySelector('.heatmap')
  });

    // now generate some random data
    var points = [];
    var max = 0;
    var width = 640;
    var height = 400;
    var len = 200;

    /*
    while (len--) {
      var val = Math.floor(Math.random()*100);
      max = Math.max(max, val);
      var point = {
        x: Math.floor(Math.random()*width),
        y: Math.floor(Math.random()*height),
        value: val
    };
    points.push(point);
    }
    */

    setInterval(function () {
        $.get(channel1 + '/feed.json?api_key=PORD1D24PPO7TB4L&results=20',function (response1) {
            $.get(channel2 + '/feed.json?api_key=QCC3G0SI5A5OEUQZ&results=20',function (response2) {

                points = [
                {
                    x: 170,
                    y: 90,
                    value: 0
                },
                {
                    x: 440,
                    y: 360,
                    value: 0
                }
                ]

                var isLeaked = [true,true];

                if(response1.feeds.length == 0) {
                    isLeaked[1] = false;
                } else {
                    for (var i = response1.feeds.length - 1; i >= 0; i--) {
                        if(response1.feeds[i]["field1"] > 0) {
                            isLeaked[1] = false;
                            break;
                        }
                    }
                }

                if(response2.feeds.length == 0) {
                    isLeaked[0] = false;
                } else {
                    for (var i = response2.feeds.length - 1; i >= 0; i--) {
                        if(response2.feeds[i]["field1"] > 0) {
                            isLeaked[0] = false;
                            break;
                        }
                    }
                }

                console.log(isLeaked);

                if(isLeaked[0] && !isLeaked[1]) {
                    points[0].value = 10;
                    if(currentView != 'water-consumption') {
                        showErrorMessage("Possible leakage at Point 1.Please check!");
                        updateAlert(0,'Point 1',"Possible leakage at Point 1.Please check!");
                    }

                    if(currentView == 'alerts') {
                        generateAlertTable();
                    }
                }

                if(isLeaked[1]  && !isLeaked[0]) {
                    points[1].value = 10;
                    if(currentView != 'water-consumption') {
                        showErrorMessage("Possible leakage at Point 2.Please check!");
                        updateAlert(1,'Point 2',"Possible leakage at Point 2.Please check!");
                    }

                    if(currentView == 'alerts') {
                        generateAlertTable();
                    }
                }

                /* For alert table testing, remove on production */
                updateAlert(0,'Point 1',"Possible leakage at Point 1.Please check!");

                /* For alert testing, remove on production */

                /*
                if(currentView != 'water-consumption') {
                    showErrorMessage("Possible leakage at Point 1.Please check!");
                }
                */

            // heatmap data format
            heatmapData = { 
              max: 10, 
              data: points 
          };
      })
.fail(function (error) {
    console.log(error);
    showErrorMessage("Can't connect to ThingSpeak server.Please check your connection.");
})
.always(function () {
    Pace.stop();
});

})
.fail(function (error) {
    console.log(error);
    showErrorMessage("Can't connect to ThingSpeak server.Please check your connection.");
})
.always(function () {
    Pace.stop();
});
},15000);
}

function generateHeatmapResult () {
    // if you have a set of datapoints always use setData instead of addData
        // for data initialization
        var reloadHeatmap = setInterval(function () {
            console.log(heatmapData);
            if(heatmapData) {
                heatmapInstance.setData(heatmapData);
            }
        },2000);
    }

    function updateAlert (alertId,location,alert) {
        var alerts = JSON.parse(localStorage.getItem('alerts'));
        if(!alerts) {
            alerts = [null,null];
        }

        if(alerts[alertId] == null ||
            alerts[alertId].status == 'Resolved') {
            // Send to the email defined on Settings
            sendEmail(alert);
        }

        alerts[alertId] = {
            'timestamp': new Date(),
            'location': location,
            'alert': alert,
            'status': 'Unresolved'
        }

        localStorage.setItem('alerts',JSON.stringify(alerts));
    }

    function generateAlertTable () {
        var alerts = JSON.parse(localStorage.getItem('alerts'));

        var tableHtml = '';
        if(alerts) {
            for (var i = 0; i < alerts.length; i++) {
                if(alerts[i] != null) {
                    tableHtml += '<tr>' +
                    '<td class="text-center">' + moment(alerts[i].timestamp).format("DD/MM/YYYY HH:mm:ss") + '</td>' +
                    '<td><strong>' + alerts[i].location + '</strong></td>' + 
                    '<td>' + alerts[i].alert + '</td>';
                    if(alerts[i].status == 'Unresolved') {
                        tableHtml += '<td><span class="label label-warning">Unresolved</span></td>' + 
                        '<td class="text-center">' + 
                        '<a onClick="resolve(' + i + ')" data-toggle="tooltip" ' + 
                        'title="Click here after the issue has been resolved" ' + 
                        'class="btn btn-effect-ripple btn-xs btn-success">' + 
                        '<i class="fa fa-check"></i></a>' + 
                        '</td></tr>';
                    } else {
                        tableHtml += '<td><span class="label label-success">Resolved</span></td>' + 
                        '<td class="text-center">' + 
                        '</td></tr>';
                    }
                }
            }

        }

        $('#alert-table').html(tableHtml);
    }

    function resolve (index) {
        var alerts = JSON.parse(localStorage.getItem('alerts'));
        alerts[index].status = 'Resolved';
        localStorage.setItem('alerts',JSON.stringify(alerts));
        generateAlertTable();
    }

    function sendEmail (alert) {
        var email = localStorage.getItem('email');

        // Fallback if no value on local storage
        if(!email) {
            email = 'khoa.zany@gmail.com';
        }

        var data = {
            "email": email,
            "title": "Alert from Smart Water",
            "content": alert
        }

        console.log(data);


        $.ajax({
            type: "POST",
            url: "http://brstgames.com/EmailCenter/General",
            dataType: "json",
            data: JSON.stringify(data),
            success: function(data) {
                if(data.status == 1) {
                    showSuccessMessage("Alert sent to your email");
                } else {
                    showErrorMessage("Email sent unsuccessfully");
                }
            },
            error: function (error) {
                showErrorMessage("Email sent unsuccessfully");
            }
        });

        $('#senderName').val('');
        $('#senderEmail').val('');
        $('#message').val('');
    }

    function changeEmail () {
        localStorage.setItem('email',$('#new-email-value').val());
    }