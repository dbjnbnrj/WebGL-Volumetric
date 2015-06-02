c = {};
c.CAM_FOV  = 45;
c.CAM_NEAR = 1;
c.CAM_FAR  = 200;
c.FOG_NEAR = 1;
c.FOG_FAR  = 20;

g = {};
g.width, g.height;
g.container, g.renderer, g.scene, g.camera, g.controls;
g.stats, g.gui;

g.lightC = [];
g.lightP = [];

var clock = new THREE.Clock();
var imagesA = [];
var imagesB = [];

function init() {
    // container
    g.container = document.getElementById("container");
    g.width  = 1024;//window.innerWidth;
    g.height = 768;//window.innerHeight;
    
    // renderer
    g.renderer = new THREE.WebGLRenderer({
        clearAlpha: 0,
        clearColor: 0xFFFFFF,
        antialias: true,
        //depth: true,
        preserveDrawingBuffer: true ,
    });

    g.renderer.setSize( g.width, g.height );
    g.renderer.autoClear = false;
    g.renderer.sortObjects = false;
    g.container.appendChild( g.renderer.domElement );


    g.depthTexture = new THREE.WebGLRenderTarget( g.width, g.height, { 
        minFilter: THREE.LinearFilter, 
        magFilter: THREE.LinearFilter, 
        format: THREE.RGBFormat 
    } );

    // camera
    g.camera = new THREE.PerspectiveCamera(
        c.CAM_FOV,
        g.width/g.height,
        c.CAM_NEAR,
        c.CAM_FAR
    );
    g.camera.position.set(0, 0, -3);
    g.camera.lookAt(new THREE.Vector3());

    g.objectCamera = new THREE.PerspectiveCamera(
        c.CAM_FOV,
        g.width/g.height,
        c.CAM_NEAR,
        c.CAM_FAR
    );
    g.objectCamera.position.set(0, 0, -3);
    g.objectCamera.lookAt(new THREE.Vector3());

    g.depthCamera = new THREE.PerspectiveCamera(
        c.CAM_FOV,
        g.width/g.height,
        c.CAM_NEAR,
        c.CAM_FAR
    );
    g.depthCamera.position.set(0, 0, -3);
    g.depthCamera.lookAt(new THREE.Vector3());

    // scene
    g.scene = new THREE.Scene();
    g.scene.add(g.camera);
    // Depth scene
    g.objectScene = new THREE.Scene();
    g.objectScene.add(g.objectCamera);
    // Depth scene
    g.depthScene = new THREE.Scene();
    g.depthScene.add(g.depthCamera);

    // trackball controls
    g.controls = new THREE.TrackballControls(g.camera, g.container);
    g.controls.rotateSpeed = 1.0;
    g.controls.zoomSpeed = 1.2;
    g.controls.panSpeed = 1.0;
    g.controls.dynamicDampingFactor = 0.3;
    g.controls.staticMoving = false;
    g.controls.noZoom = false;
    g.controls.noPan = false;

    g.time = 40


    g.scene.fog = new THREE.Fog( 0x000000, c.FOG_NEAR, c.FOG_FAR );
    var colorTex = THREE.ImageUtils.loadTexture("textures/jet.png");
    var voltex = THREE.ImageUtils.loadTexture("textures/L/out"+g.time+".png");
    var voltex2 = THREE.ImageUtils.loadTexture("textures/RL/out"+g.time+".png");
    
    voltex.minFilter = voltex.magFilter = THREE.LinearFilter;
    voltex.wrapS = voltex.wrapT = THREE.ClampToEdgeWrapping;


    voltex2.minFilter = voltex2.magFilter = THREE.LinearFilter;
    voltex2.wrapS = voltex2.wrapT = THREE.ClampToEdgeWrapping;
    
    colorTex.minFilter = colorTex.magFilter = THREE.LinearFilter;
    colorTex.wrapS = colorTex.wrapT = THREE.ClampToEdgeWrapping;
    
    var colorTexDim =  new THREE.Vector3(347.0, 18.0, 0.0);
    var SIDESIZE = 100;
    var voltexDim = new THREE.Vector3(100, 100, 100);
    var volcol = new THREE.Vector3(1.0, 1.0, 1.0);

    g.offset = new THREE.Vector3();
    
    g.uniforms = {
        uCamPos:    { type: "v3", value: g.camera.position },
        uColor:     { type: "v3", value: volcol },
        uTex:       { type: "t", value: 0, texture: voltex },
        depthTex:       { type: "t", value: 3, texture: voltex },
        uTexDim:    { type: "v3", value: voltexDim },
        uTex2:       { type: "t", value: 2, texture: voltex2 },
        colorTex:   { type: "t", value: 1, texture: colorTex },
        colorTexDim: { type: "v3", value: colorTexDim },
        uOffset:    { type: "v3", value: g.offset },
        uTMK:       { type: "f", value: 10.0 }
    };
    
    shader = new THREE.ShaderMaterial({
        uniforms:       g.uniforms,
        vertexShader:   loadTextFile("shaders/vol-vs.glsl"),
        fragmentShader: loadTextFile("shaders/vol-fs.glsl"),
        depthWrite:     false
    });

    depthShader = new THREE.ShaderMaterial({
        uniforms:       g.uniforms,
        vertexShader:   loadTextFile("shaders/scenevs.glsl"),
        fragmentShader: loadTextFile("shaders/scenefs.glsl"),
        depthWrite:     false
    });

    g.cube = new THREE.Mesh(
        new THREE.CubeGeometry( 1.0, 1.0, 1.0 ),    // must be unit cube
        shader //new THREE.MeshBasicMaterial( { color: 0x00CCCC } )
    );
    
    g.scene.add(g.cube);

    g.littlecube = new THREE.Mesh(
        new THREE.CubeGeometry( 0.5, 0.5, 0.5 ),    // must be unit cube
        new THREE.MeshBasicMaterial( { color : 0x00FF00 } )
    );

    //g.objectScene.add(g.littlecube);
    g.littlecube2 = new THREE.Mesh(
        new THREE.CubeGeometry( 0.5, 0.5, 0.5 ),    // must be unit cube
        depthShader //new THREE.MeshBasicMaterial( { color : 0x0000FF } )
    );

    //g.depthScene.add(g.littlecube2);    

    // insert stats
    g.stats = new Stats();
    g.stats.domElement.style.position = 'absolute';
    g.stats.domElement.style.top = '0px';
    g.stats.domElement.style.zIndex =100;
    g.container.appendChild( g.stats.domElement );
    
    // init gui
    g.gui = new dat.GUI({ autoPlace:false });
    $("#gui-container").append(g.gui.domElement);
    
    // hack to edit gui
    $(g.gui.__closeButton).hide();
    $(g.gui.__resize_handle).hide();

    // add line



    for(var i = 0; i< 100; i++)
    {
        imagesA[i]=THREE.ImageUtils.loadTexture("textures/L/out"+i+".png");
        imagesB[i]=THREE.ImageUtils.loadTexture("textures/RL/out"+i+".png");
    }
    
    
    g.guiline = g.gui.add(g, "time").min(0.0).max(100.0).step(1).onFinishChange(
        (function(){
            if(g.time ==100)
                g.time = 0;
            voltex = imagesA[g.time];
            g.uniforms.uTex.texture = voltex;
            g.uniforms.uTex.needsUpdate = true;

            voltex = imagesB[g.time];
            g.uniforms.uTex2.texture = voltex;
            g.uniforms.uTex2.needsUpdate = true;
            g.time += 1;})
        );


    window.addEventListener( 'resize', onWindowResize, false );
}

function start_animate() 
{
    g.time = 0;
    g.animateTime = setInterval(
      (function(){
      if(g.time >= 100)
      g.time = 0;
      voltex = imagesA[g.time];
      voltex2 = imagesB[g.time];
      g.uniforms.uTex.texture = voltex;
      g.uniforms.uTex.needsUpdate = true;
      g.uniforms.uTex2.texture = voltex2;
      g.uniforms.uTex2.needsUpdate = true;
      g.time += 1;}),
      1000/3 ); 
}

function stop(){
    clearInterval(g.animateTime);
}

function onWindowResize(event) {
    g.width  = window.innerWidth;
    g.height = window.innerHeight;

    g.renderer.setSize( g.width, g.height );

    g.camera.aspect = g.width / g.height;
    g.camera.updateProjectionMatrix();

    g.controls.screen.width = g.width;
    g.controls.screen.height = g.height;
    g.controls.radius = ( g.width + g.height ) / 4;
}


function update() {
    //animate();
    g.stats.update();
    g.controls.update();

    // render
    g.renderer.clear();
    g.depthCamera.position.copy( g.camera.position );
    g.depthCamera.rotation.copy( g.camera.rotation );
    g.objectCamera.position.copy( g.camera.position );
    g.objectCamera.rotation.copy( g.camera.rotation );
    g.renderer.render( g.depthScene, g.depthCamera, g.depthTexture, true );
    g.uniforms.depthTex.texture = g.depthTexture;
    //g.uniforms.uTex.texture.needsUpdate = true;
    g.renderer.render( g.objectScene, g.objectCamera );
    g.renderer.render( g.scene, g.camera );

    requestAnimationFrame(update);
}

// perform synchronous ajax load
function loadTextFile(url) {
    var result;
    
    $.ajax({
        url:      url,
        type:     "GET",
        async:    false,
        dataType: "text",
        success:  function(data) {
            result = data;
        }
    });
    
    return result;
}

function mousetrap() {
    var STEP = 0.05;
    
    Mousetrap.bind("up", function() {
        g.offset.y-=STEP;
    });
    Mousetrap.bind("down", function() {
        g.offset.y+=STEP;
    });
    Mousetrap.bind("left", function() {
        g.offset.x-=STEP;
    });
    Mousetrap.bind("right", function() {
        g.offset.x+=STEP;
    });
    
    Mousetrap.bind("shift+r", function() {
        console.log("hotkey: reset camera");
        g.camera.position.set(0, 0, -3);
        g.camera.up.set(0, 1, 0);
        g.camera.lookAt(new THREE.Vector3());
    });
}



$(function() {
    init();
    update();
    mousetrap();
});
