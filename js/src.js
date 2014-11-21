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
var _depthloaded = false;
var _colourloaded = false;
var max = pH*pW*4;

var maps = 
    [
    //    ['C10W.png', 'D10.png'],
        ['C1.png', 'D1.png'],
    //    ['C2W.png', 'D2.png'],
    //    ['C3.png', 'D3.png'],
    //    ['C4.png', 'D4.png'],
    //    ['C5W.png', 'D5.png'],
    //    ['C6W.png', 'D6.png'],
        ['C7W.png', 'D7.png'],
    //   ['C8.png', 'D8.png'],
    //    ['C9W.png', 'D9.png']
    ]

var pos = 0;
var num_maps = maps.length;

function load(file, type) {
    
    var req = new XMLHttpRequest();
    req.onload = function() {
        if (req.readyState === 4) {
            if (req.status === 200) {
                var buf = new Uint8Array(req.response || req.mozResponseArrayBuffer);
                var png = new PNG(buf);
                if (type === 'depth') { depthmap = png.decode(); _depthloaded = true;}
                if (type === 'colour') { colourmap = png.decode(); _colourloaded = true; }
                console.log('loaded ' + type);

                //if (_depthloaded && _colourloaded) {

                //    resetCamera();
                //    _depthloaded = false;
                //    _colourloaded = false;
                //}

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
    pitch:-100
}

function resetCamera() {
    camera.x = 512;
    camera.y = 400;
    camera.height = -50;
    camera.angle = 0;
    camera.pitch =-100;
}

function raycast(col, sx, sy, ex, ey, fz) {

    var dx = (sx - ex);
    var dy = (sy - ey);
    var r = Math.floor(Math.sqrt(dx * dx + dy * dy));

    dx = (dx/r);
    dy = (dy/r);

    var x = sx;
    var y = sy;

    
    r  = r/2
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
        var z = ((depthVal/heightScale) * 200 - camera.pitch);

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
        // [cos, -sin] [x]
        // [sin,  cos] [y]
        

        rx = ca*relx - sa*rely;
        ry = sa*relx + ca*rely;

        
        var endx = rx + startx // relative to mid point in map;
        var endy = ry + starty; // always furthest out in the map
        

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

    //load('C1.png', "colour");
    //load('D1.png', "depth");

    loadmaps();
    
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

function loadmaps() {
    console.log(pos);
    console.log(maps[pos]);
    load(maps[pos][0], "colour");
    load(maps[pos][1], "depth");
    pos++;
    pos = pos % num_maps;
    console.log(pos);

}

init();
render();

Mousetrap.bind('w', function() { 

    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);

    camera.x += - sa*4;
    camera.y += ca*4;

});

Mousetrap.bind('a', function() { 

    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);
    
    camera.x += ca*3;
    camera.y += sa*3

});

Mousetrap.bind('s', function() { 

    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);

    camera.x -= -sa*4;
    camera.y -= ca*4;

});

Mousetrap.bind('d', function() { 
 
    var ca = Math.cos(camera.angle); 
    var sa = Math.sin(camera.angle);
    
    camera.x -= ca*3;
    camera.x -= sa*3

});

Mousetrap.bind('left', function() { camera.angle -= 0.05});
Mousetrap.bind('right', function() { camera.angle += 0.05});
Mousetrap.bind('up', function() { camera.pitch -= 10});
Mousetrap.bind('down', function() { camera.pitch += 10});
Mousetrap.bind('ctrl+up', function() { camera.height += 10});
Mousetrap.bind('ctrl+down', function() { camera.height -= 10});
Mousetrap.bind('space', function() { loadmaps(); });

