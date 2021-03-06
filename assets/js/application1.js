window.addEventListener("load", resizeCanvas, false);
window.addEventListener("resize", resizeCanvas, false);

var loop = null;

function resizeCanvas(){ 
  var c = $('#graphic');
  var p = $('#graphic_holder');
  var displayCanvas = document.getElementById("graphic");
  displayCanvas.width = p.width();
  displayCanvas.height = p.height();
  c.width(p.width());
  c.height(p.height());
  console.log(c.width()+', '+c.height())
  canvasApp();
}

//for debug messages
var Debugger = function() { };
Debugger.log = function(message) {
  try {
    console.log(message);
  }
  catch (exception) {
    return;
  }
}

function canvasApp() {
  var displayCanvas = document.getElementById("graphic");
  var context = displayCanvas.getContext("2d");
  var displayWidth = displayCanvas.width;
  var displayHeight = displayCanvas.height;
  
  console.log(displayWidth+', '+displayHeight)

  //off screen canvas
  var bufferCanvas;
  var bufferContext;
  
  var rowHeight;
  var stringSpacing;
  var stringThickness;
  var margin;
  var bgColor;
  var numStrings;
  var crossingProbability;
  var positiveProbability;
  var crossingAngle;
  var controlYFactor;
  var spacerGap;
  var generatorsInLastRow;
  var colors;
  var gradDX, gradDY;
  var timer;
  var scrollAmt;
  var probInc;
  var maxProb;
  
  init();
  
  function init() {
    if(loop!=null)
      window.cancelAnimationFrame(loop);
    rowHeight = 20;
    stringSpacing = 11;
    stringThickness = 5;
    diskFactor = 1.2;
    bgColor = "#000000";
    numStrings = 1 + Math.floor((displayWidth-stringThickness)/stringSpacing);
    margin = (displayWidth - (numStrings-1)*stringSpacing)/2;
    crossingProbability = 0.8;
    positiveProbability = 0.5;
    spacerGap = 0.5;
    
    crossingAngle = 42*Math.PI/180;
    controlYFactor = (1 - stringSpacing/rowHeight*Math.tan(crossingAngle));
    
    var gradDist = 2*stringThickness;
    gradDX = gradDist*Math.cos(crossingAngle);
    gradDY = gradDist*Math.sin(crossingAngle);
    
    //context.fillStyle = bgColor;
    //context.fillRect(0,0,displayWidth,rowHeight);   
    
    setInitialColors();
    
    //initialize generatorsInLastRow - an array which records which braid generators appeared in the previous row.
    //I want to know this in order to avoid a braid crossing followed by its inverse.
    generatorsInLastRow = [];
    for (var k = 0; k < numStrings-1; k++) {
      generatorsInLastRow.push(0);
    }
    
    //set up buffer canvas which will hold next row to be added
    bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = displayWidth;
    bufferCanvas.height = rowHeight;
    bufferContext = bufferCanvas.getContext("2d");
    
    //paint initial screen with braids
    crossingProbability = 0;
    context.fillStyle = bgColor;
    context.fillRect(0,0,displayWidth,displayHeight);
    var i = Math.floor(displayHeight/rowHeight);
    while (--i > -1) {
      fillRow(context, i*rowHeight);  
    }
    
    probInc = 0.03;
    maxProb = 0.8;
    
    //fill buffer with next row
    fillRow(bufferContext, 0);
    
    scrollAmt = 1;
    
    //setAnimationFrame shim by Paul Irish, paulirish.com
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){
          window.setTimeout(callback, 1000 / 60);
          };
    })();
    
    (function animloop(){
      loop = requestAnimFrame(animloop);
      onTimer();
    })();
  }
  
  function onTimer() {
        
    //scroll down one pixel
    context.drawImage(displayCanvas, 0, 0, displayWidth, displayHeight-1, 0, 1, displayWidth, displayHeight-1);
    
    //clear top slice
    context.fillStyle = bgColor;
    context.fillRect(0,0,displayWidth,1);
        
    //draw new top row when used up
    if (scrollAmt > rowHeight) {
      //crossing probability will evolve over time as animation progresses.
      crossingProbability += probInc;
      if (crossingProbability > maxProb) {
        crossingProbability = maxProb;
        probInc *= -1;
      }
      else if (crossingProbability < 0) {
        crossingProbability = 0;
        probInc *= -1;
      }
      scrollAmt = 1;
      bufferContext.clearRect(0,0,displayWidth,rowHeight);
      fillRow(bufferContext, 0);
    }
    
    //copy from buffer into top slice
    context.drawImage(bufferCanvas, 0, rowHeight-scrollAmt, displayWidth, 1, 0, 0, displayWidth, 1);
    
    scrollAmt++;
  }
  
  
  function fillRow(ctx, y0) {
    var stringNumber = 0;
    var x0;
    var temp;
    var positiveSwitch;
    var doPositive;
    while (stringNumber < numStrings - 1) {
      x0 = margin + stringNumber*stringSpacing;
      if (Math.random() < crossingProbability) {
        positiveSwitch = (Math.random() < positiveProbability);
        doPositive = (positiveSwitch && (generatorsInLastRow[stringNumber] != -1)) ||
                ((!positiveSwitch) && (generatorsInLastRow[stringNumber] == 1));
        if (doPositive) {
          drawCrossing(ctx, x0, y0, colors[stringNumber], colors[stringNumber+1], true);
          generatorsInLastRow[stringNumber] = 1;
          generatorsInLastRow[stringNumber+1] = 0;
        }
        else {
          drawCrossing(ctx, x0, y0, colors[stringNumber], colors[stringNumber+1], false);
          generatorsInLastRow[stringNumber] = -1;
          generatorsInLastRow[stringNumber+1] = 0;
        }
        //permute colors
        temp = colors[stringNumber];
        colors[stringNumber] = colors[stringNumber+1];
        colors[stringNumber+1] = temp;
        
        //advance
        stringNumber += 2;
      }
      else {
        drawString(ctx, x0, y0, colors[stringNumber]);
        stringNumber += 1;
      }
    }
    if (stringNumber == numStrings - 1) {
      drawString(ctx, margin + stringNumber*stringSpacing, y0, colors[stringNumber]);
    }
  }
  
  function setInitialColors() {
    var i;
    var r,g,b;
    var darkR, darkG, darkB;
    var lightR, lightG, lightB;
    var param;
    
    colors = [];
    
    var darkFactor = 0.33;
    var lightAdd = 20;

    
    for (i = 0; i < numStrings; i++) {
      if (i == 0) {
        r = 200;
        g = 0;
        b = 0;
      }
      else {
        var t = i/(numStrings-1);
        r = Math.floor(t*200);
        g = Math.floor(100+t*100);
        b = 200;
      }
          
      darkR = Math.floor(darkFactor*r);
      darkG = Math.floor(darkFactor*g);
      darkB = Math.floor(darkFactor*b);
      
      lightR = Math.min(Math.floor(r + lightAdd),255);
      lightG = Math.min(Math.floor(g + lightAdd),255);
      lightB = Math.min(Math.floor(b + lightAdd),255);
      
      var colorObj = {
        base: "rgb("+r+","+g+","+b+")",
        dark: "rgb("+darkR+","+darkG+","+darkB+")",
        light: "rgb("+lightR+","+lightG+","+lightB+")"
      }
      colors.push(colorObj);
    } 
  }
  
  function drawString(ctx, x0,y0,color) {
    ctx.strokeStyle = color.base;
    ctx.lineWidth = stringThickness;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x0,y0+rowHeight);
    ctx.stroke();
  }
  
  function drawCrossing(ctx, x0,y0,color1,color2,positive) {
    var grad; 
    var midX = x0 + stringSpacing/2;
    var midY = y0 + rowHeight/2;
    ctx.lineCap = "butt";
    if (positive) {
      grad = ctx.createLinearGradient(midX+gradDX, midY-gradDY, midX-gradDX, midY+gradDY);
      grad.addColorStop(0, color1.base);
      grad.addColorStop(0.5, color1.dark);
      grad.addColorStop(1, color1.base);
      ctx.strokeStyle = grad;
      drawLine1();
      
      drawSpacer2();
      
      grad = ctx.createLinearGradient(midX+gradDX, midY+gradDY, midX-gradDX, midY-gradDY);
      grad.addColorStop(0, color2.base);
      grad.addColorStop(0.5, color2.light);
      grad.addColorStop(1, color2.base);
      ctx.strokeStyle = grad;
      drawLine2();
    }
    else {
      grad = ctx.createLinearGradient(midX+gradDX, midY+gradDY, midX-gradDX, midY-gradDY);
      grad.addColorStop(0, color2.base);
      grad.addColorStop(0.5, color2.dark);
      grad.addColorStop(1, color2.base);
      ctx.strokeStyle = grad;
      drawLine2();
      
      drawSpacer1();
      
      grad = ctx.createLinearGradient(midX+gradDX, midY-gradDY, midX-gradDX, midY+gradDY);
      grad.addColorStop(0, color1.base);
      grad.addColorStop(0.5, color1.light);
      grad.addColorStop(1, color1.base);
      ctx.strokeStyle = grad;
      drawLine1();
    }
    
    function drawLine1() {
      ctx.lineWidth = stringThickness;
      ctx.beginPath();
      ctx.moveTo(x0+stringSpacing,y0);
      ctx.bezierCurveTo(x0+stringSpacing, y0+rowHeight*controlYFactor, 
                  x0, y0+rowHeight*(1-controlYFactor), 
                  x0, y0+rowHeight);
      ctx.stroke();
    }
    
    function drawSpacer1() {
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = stringThickness + spacerGap*2;
      ctx.beginPath();
      ctx.moveTo(x0+stringSpacing,y0);
      ctx.bezierCurveTo(x0+stringSpacing, y0+rowHeight*controlYFactor, 
                  x0, y0+rowHeight*(1-controlYFactor), 
                  x0, y0+rowHeight);
      ctx.stroke();
    }
        
    function drawSpacer2() {
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = stringThickness+2*spacerGap;
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.bezierCurveTo(x0, y0+rowHeight*controlYFactor, 
                  x0+stringSpacing, y0+rowHeight*(1-controlYFactor), 
                  x0+stringSpacing, y0+rowHeight);
      ctx.stroke();
    }

    
    function drawLine2() {
      ctx.lineWidth = stringThickness;
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.bezierCurveTo(x0, y0+rowHeight*controlYFactor, 
                  x0+stringSpacing, y0+rowHeight*(1-controlYFactor), 
                  x0+stringSpacing, y0+rowHeight);
      ctx.stroke();
    }
  }
}
