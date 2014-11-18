var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");
var scene = context.createImageData(canvas.width, canvas.height);

// map dim
var pW = 1024;
var pH = 1024;

// map
var depthmap = new Uint8Array(pW*pH);
var colourmap = new Uint8Array(pW*pH);
var bg = new Uint8Array(scene.height*scene.width*4);
var buffer = new Uint32Array(scene.height*scene.width*4);
var _depthloaded = false;
var _colourloaded = false;
var max = pH*pW*4;

function load(file, type) {
    
    var req = new XMLHttpRequest();
    req.onload = function() {
        if (req.readyState === 4) {
            if (req.status === 200) {
                var buf = new Uint8Array(req.response || req.mozResponseArrayBuffer);
                var png = new PNG(buf);
                if (type === 'depth') { depthmap = png.decode(); _depthloaded = true; }
                if (type === 'colour') { colourmap = png.decode(); _colourloaded = true; }
            } else {
                console.log('Failed to load: ' + req.statusText);
            }
        }
    }

    req.onerror = function() {
        console.log('Failed to load: ' + req.statusText);
    }

    req.open("GET", 
             "terrain/"  + type +  "/" + file,
             true);

    req.responseType = "arraybuffer";
    req.send();

}

var focalDepth = 300;
var camera = {
    x: 512,
    y: 400,
    height: -50,
    angle: 0,
    v: -100
}


function raycast(col, sx, sy, ex, ey, fz) {

    var dx = (sx - ex);
    var dy = (sy - ey);
    var r = Math.floor(Math.sqrt(dx * dx + dy * dy));

    dx = (dx/r);
    dy = (dy/r);

    var x = sx;
    var y = sy;

    
    var ymin = scene.height;
    for (var i=0; i < r; i++) {

        x+=dx; // dont start at location;
        y+=dy;
        
        //var mapoffset = pW*Math.floor(y)*4 + Math.floor(x)*4;
        // voodoo
        var mapoffset = ((((Math.floor(y) & 4095) << 10) + (Math.floor(x) & 4095)) * 4)%max;
        //var mapoffset = (((Math.floor(y) & 1023) << 10) + (Math.floor(x) & 1023)) * 4;
        window.mapoffset = mapoffset;


        var depthVal = depthmap[mapoffset];  
        
        var colourVal= { 
            r:colourmap[mapoffset + 0],
            g:colourmap[mapoffset + 1],
            b:colourmap[mapoffset + 2],
            a:colourmap[mapoffset + 3]
        };

        
        // invert depthvals and shift by height
        depthVal = 128 - depthVal + camera.height;

        // prespective calc && 'zbuf' check
        var heightScale = Math.abs(fz) * i;
        var z = ((depthVal/heightScale) * 100 - camera.v)*4;

        if (z < 0) z = 0;
        if ( z < scene.height*4 - 1) {
            var offset = (Math.floor(z) * scene.width * 4) + col;

            for (var k = Math.floor(z); k < ymin; k++) {
                scene.data[offset + 0] = colourVal.r; 
                scene.data[offset + 1] = colourVal.g; 
                scene.data[offset + 2] = colourVal.b; 
                scene.data[offset + 3] = colourVal.a; 
                offset+= scene.width*4;

            }

        }

        if(ymin > z) ymin = Math.floor(z);
    } 
}

function update() {
    var size = scene.width * scene.height;
    
    var startx = camera.x;
    var starty = camera.y;

    // calc camera rotation
    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);

    scene.data.set(bg);

    for (var i = 0; i < scene.width*4; i+=4) {
        
        var relx = (i - scene.width*4/2);
        var rely = (-1*focalDepth)*4;

        // rotate vector by angle
        
        var endx = relx + startx // relative to mid point in map;
        var endy = rely + starty; // always furthest out in the map
        

        var fz = rely / (Math.sqrt(relx*relx + rely*rely));

        raycast(i, startx, starty, endx, endy, fz);

    }

   context.putImageData(scene, 0, 0);
}

function render() {
    requestAnimationFrame(render);
    update();
}

function init() {

    load('C1.png', "colour");
    load('D1.png', "depth");
    
    var size = scene.width * scene.height;
    
    for (var i = 0; i < size*4; i+=4) {
        bg[i + 0] = 160; 
        bg[i + 1] = 160;
        bg[i + 2] = 255;
        bg[i + 3] = 255;
    } 
   
    scene.data.set(bg);
    context.putImageData(scene, 0, 0);
}

init();
render();
Mousetrap.bind('w', function() { camera.y += 3 }, 'keydown');
Mousetrap.bind('a', function() { camera.x += 3 }, 'keydown');
Mousetrap.bind('s', function() { camera.y -= 3 }, 'keydown');
Mousetrap.bind('d', function() { camera.x -= 3 }, 'keydown');

