var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");
var scene = context.createImageData(canvas.width, canvas.height);

load('C1.png', "colour");
load('D1.png', "depth");

// map dim
var pW = 1024;
var pH = 1024;

// map
var depthmap = new Uint8Array(pW*pH);
var colourmap = new Uint8Array(pW*pH);
var _depthloaded = false;
var _colourloaded = false;

function load(file, type) {
    var req = new XMLHttpRequest();
    req.responseType = "arraybuffer";
    req.onload = function() {
        if (req.readyState === 4) {
            if (req.status === 200) {
                var buf = new Uint8Array(req.response || req.mozResponseArrayBuffer);
                var png = new PNG(buf);
                if (type === 'depth') { depthmap = png.decode(); _depthloaded = true; }
                if (type === 'colour') { colourmap = png.decode(); _colourloaded = true; }
                //png.render(canvas);
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

    req.send();
}

var camera = {
    x: 512,
    y: 800,
    height: -50,
    angle: 0,
    v: -100
}

var focalDepth = 400;
var scale = 1.5;

function raytrace(col, sx, sy, ex, ey, fz) {

    var dx = (sx -ex);
    var dy = (sy -ey);
    var r = Math.floor(Math.sqrt(dx * dx + dy * dy));
    dx = dx/r;
    dy = dy/r;

    var x = sx;
    var y = sy;

    var ymin = scene.height;
    for (var i=0; i < r; i++) {
        x+=dx; // dont start at location;
        y+=dy;
        
        //var mapoffset = pH*y*4 + x*4;
        // voodoo
        var mapoffset = ((Math.floor(y) & 1023) << 10) + (Math.floor(x) & 1023) * 4;
        window.mapoffset = mapoffset;


        var depthVal = depthmap[mapoffset];  
        
        var colourVal= { 
            r:colourmap[mapoffset + 0],
            g:colourmap[mapoffset + 1],
            b:colourmap[mapoffset + 2],
            a:colourmap[mapoffset + 3]
        }

        // prespective calc && 'zbuf' check
        depthVal = 128 - depthVal + camera.height;
        var heightScale = Math.abs(fz) * i;
        var z = depthVal/heightScale * 100 - camera.v;

        if (z < 0) z = 0;
        if ( z < scene.height - 1) {
            var offset = (Math.floor(z) * scene.width) + col;

            for (var k = Math.floor(z); k < ymin; k++) {
                scene.data[offset + 0] = colourVal.r; 
                scene.data[offset + 1] = colourVal.g; 
                scene.data[offset + 2] = colourVal.b; 
                scene.data[offset + 3] = colourVal.a; 
                offset+= scene.width;
            }
        }

        if(ymin > z) ymin = Math.floor(z);
    } 
}

function update() {
    var size = scene.width * scene.height;

    // calc camera rotation
    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);

    for (var i = 0; i < size*4; i+=4) {
        scene.data[i + 0] = 160; 
        scene.data[i + 1] = 160;
        scene.data[i + 2] = 255;
        scene.data[i + 3] = 255;
    } 

    var startx = camera.x;
    var starty = camera.y;

    for (var i = 0; i < scene.width; i++) {
        // rotate vector by angle

        // what happens when i dont start in the middle?
        var endx = ((i - scene.width) + scene.width/2) + startx// relative to mid point in map;
        var endy = (-1*focalDepth) * scale + starty; // always furthest out in the map

        var dx = endx - startx;
        var dy = endy - starty;

        var fz = dy / (Math.sqrt(dx*dx + dy*dy));

        raytrace(i, startx, starty, endx, endy, fz);

    }


   context.putImageData(scene, 0, 0);
}

function render() {
    requestAnimationFrame(render);
    update();
}


render();

