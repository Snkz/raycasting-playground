var canvas = document.getElementById('canvas');

load('C1.png', "colour");
load('D1.png', "depth");

var pW = 1024;
var pH = 1024;

var depthmap = new Uint8Array(pW*pH);
var colourmap = new Uint8Array(pW*pH);
var depthloaded = false;
var colourloaded = false;

function load(file, type) {
    var req = new XMLHttpRequest();
    req.responseType = "arraybuffer";
    req.onload = function() {
        if (req.readyState === 4) {
            if (req.status === 200) {
                var buf = new Uint8Array(req.response || req.mozResponseArrayBuffer);
                var png = new PNG(buf);
                if (type === 'depth') { depthmap = png.decode(); depthloaded = true; }
                if (type === 'colour') { colourmap = png.decode(); colourloaded = true; }
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
