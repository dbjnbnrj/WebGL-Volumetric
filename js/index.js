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
var vanim;

function init() {
    // container
    g.container = document.getElementById("container");
    g.width  = 1024;//window.innerWidth;
    g.height = 768;//window.innerHeight;
    
    // renderer
    g.renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    g.renderer.setClearColor(0xFFFFFF, 0.0);
    g.renderer.setSize( g.width, g.height );
    g.renderer.setBlending( THREE.NormalBlending );
    g.renderer.setDepthTest( false );
    g.renderer.autoClear = false;
    g.renderer.sortObjects = false;
    //g.renderer.sortObjects = false;
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
    g.camera.lookAt(new THREE.Vector3(0, 0, 0));

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
    g.controls = new THREE.TrackballControls( g.camera);

    g.controls.rotateSpeed = 1.0;
    g.controls.zoomSpeed = 1.2;
    g.controls.panSpeed = 0.8;

    g.controls.noZoom = false;
    g.controls.noPan = false;

    g.controls.staticMoving = true;
    g.controls.dynamicDampingFactor = 0.3;

    g.controls.keys = [ 65, 83, 68 ];

    g.time = 1;

    var colorTex = THREE.ImageUtils.loadTexture("textures/jet.png");
    var voltex = THREE.ImageUtils.loadTexture("textures/L/out"+g.time+".png");
    var voltex2 = THREE.ImageUtils.loadTexture("textures/L/out"+g.time+".png");
    
    voltex.minFilter = voltex.magFilter = THREE.LinearFilter;
    voltex.wrapS = voltex.wrapT = THREE.ClampToEdgeWrapping;


    voltex2.minFilter = voltex2.magFilter = THREE.LinearFilter;
    voltex2.wrapS = voltex2.wrapT = THREE.ClampToEdgeWrapping;
    
    colorTex.minFilter = colorTex.magFilter = THREE.LinearFilter;
    colorTex.wrapS = colorTex.wrapT = THREE.ClampToEdgeWrapping;

    g.rtTexture = new THREE.WebGLRenderTarget( g.width, g.height, { minFilter: THREE.LinearFilter,
                                                                  magFilter: THREE.NearestFilter,
                                                                  format: THREE.RGBAFormat } );
    
    var colorTexDim =  new THREE.Vector3(347.0, 18.0, 0.0);
    var SIDESIZE = 100;
    var voltexDim = new THREE.Vector3(100, 100, 100);
    var volcol = new THREE.Vector3(1.0, 1.0, 1.0);

    g.offset = new THREE.Vector3();
    
    g.uniforms = {
        uCamPos:    { type: "v3", value: g.camera.position },
        uColor:     { type: "v3", value: volcol },
        uTex:       { type: "t", value: voltex },
        depthTex:   { type: "t", value: g.rtTexture },
        uTexDim:    { type: "v3", value: voltexDim },
        uTex2:      { type: "t", value: voltex2 },
        colorTex:   { type: "t", value : colorTex },
        colorTexDim:{ type: "v3", value: colorTexDim },
        uOffset:    { type: "v3", value: g.offset },
        uTMK:       { type: "f", value: 10.0 }
    };
    
    shader = new THREE.ShaderMaterial({
        uniforms:       g.uniforms,
        vertexShader:   loadTextFile("shaders/vol-vs.glsl"),
        fragmentShader: loadTextFile("shaders/vol-fs.glsl"),
        depthWrite:     false,
        transparent: true
    });

    depthShader = new THREE.ShaderMaterial({
        uniforms:       g.uniforms,
        vertexShader:   loadTextFile("shaders/scenevs.glsl"),
        fragmentShader: loadTextFile("shaders/scenefs.glsl"),
        depthWrite:     true, // Need to write the depth so the doublesided portion of the shader works
        side: THREE.DoubleSide // The object meshes from PYURDME are implicitly double sided
    });

    g.cube = new THREE.Mesh(
        new THREE.BoxGeometry( 1.0, 1.0, 1.0 ),    // must be unit cube
        shader//new THREE.MeshBasicMaterial( { color: 0xFF1111, opacity: 0.5, transparent : true } )
    );

    g.scene.add(g.cube);

    // Load all the timeseries data
    colors = []
    imagesA = []
    imagesB = []

    for(var i = 0; i< 100; i++)
    {
        colors[i] = $.parseJSON(loadTextFile("timeSeries/colors" + i + ".json"));
        imagesA[i] = THREE.ImageUtils.loadTexture("textures/L/out" + i + ".png");
        imagesB[i] = THREE.ImageUtils.loadTexture("textures/L/out" + i + ".png");
    }

    //Load up the mesh from file
    var loader = new THREE.JSONLoader();

    var modelMeshJSON = loadTextFile('subdomain2.json');
    //Build the object that will render the SURFACE CONCENTRATIONS
    var model = loader.parse($.parseJSON(modelMeshJSON));

    var material = new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors});
    material.side = THREE.DoubleSide;

    g.nucleusMesh = new THREE.Mesh(model.geometry, material);

    for (var i = 0; i < g.nucleusMesh.geometry.faces.length; i++) {
        var f  = g.nucleusMesh.geometry.faces[i];

        f.vertexColors[0] = new THREE.Color(colors[g.time][f.a]);
        f.vertexColors[1] = new THREE.Color(colors[g.time][f.b]);
        f.vertexColors[2] = new THREE.Color(colors[g.time][f.c]);
    }

    g.objectScene.add(g.nucleusMesh)
    g.littlecube = new THREE.Mesh(
        new THREE.BoxGeometry( 0.5, 0.5, 0.5 ),    // must be unit cube
        depthShader//new THREE.MeshBasicMaterial( { color : 0x1111FF
                   //                  } )
    );

    var material = new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors, wireframe:false});
    material.side = THREE.DoubleSide;
	
    var model = loader.parse($.parseJSON(modelMeshJSON));
    mesh = new THREE.Mesh(model.geometry, depthShader);
    g.depthScene.add(mesh/*g.littlecube*/)

    // insert stats
    g.stats = new Stats();
    g.stats.domElement.style.position = 'absolute';
    g.stats.domElement.style.top = '0px';
    g.stats.domElement.style.zIndex = 100;
    g.container.appendChild( g.stats.domElement );
    
    // init gui
    g.gui = new dat.GUI({ autoPlace:false });
    $("#gui-container").append(g.gui.domElement);
    
    // hack to edit gui
    $(g.gui.__closeButton).hide();
    $(g.gui.__resize_handle).hide();

    // add line
    
    setInterval(
        (function(){
            g.time += 1;
            if(g.time >= 20)
                g.time = 0;

            console.log(g.time)

            for (var i = 0; i < g.nucleusMesh.geometry.faces.length; i++) {
                var f  = g.nucleusMesh.geometry.faces[i];
                
                f.vertexColors[0].setHex(colors[g.time][f.a]);
                f.vertexColors[1].setHex(colors[g.time][f.b]);
                f.vertexColors[2].setHex(colors[g.time][f.c]);
            }

            g.nucleusMesh.geometry.colorsNeedUpdate = true;
            
            voltex = imagesA[g.time];
            voltex2 = imagesB[g.time];
            g.uniforms.uTex.value = voltex;
            g.uniforms.uTex.needsUpdate = true;
            g.uniforms.uTex2.value = voltex;
            g.uniforms.uTex2.needsUpdate = true;}),
        1000/5 );

    window.addEventListener( 'resize', onWindowResize, false );
}

function animate() 
{
    requestAnimationFrame( animate ); 
    
}

function onWindowResize(event) {
    g.width  = window.innerWidth;
    g.height = window.innerHeight;

    g.renderer.setSize( g.width, g.height );

    g.camera.aspect = g.width / g.height;
    g.camera.updateProjectionMatrix();
}


function update() {
    animate();
    g.stats.update();
    g.controls.update();

    // render
    g.renderer.clear();
    g.depthCamera.position.copy( g.camera.position );
    g.depthCamera.rotation.copy( g.camera.rotation );
    g.objectCamera.position.copy( g.camera.position );
    g.objectCamera.rotation.copy( g.camera.rotation );
    g.renderer.render( g.depthScene, g.depthCamera, g.rtTexture, true );
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
/*
    var faceIndices = [ 'a', 'b', 'c', 'd' ];

    var color, f, f2, f3, p, n, vertexIndex,

    radius = 1,

    geometry  = new THREE.IcosahedronGeometry( radius, 1 ),
    geometry2 = new THREE.IcosahedronGeometry( radius, 1 ),
    geometry3 = new THREE.IcosahedronGeometry( radius, 1 );

    for ( var i = 0; i < geometry.faces.length; i ++ ) {

	f  = geometry.faces[ i ];
	f2 = geometry2.faces[ i ];
	f3 = geometry3.faces[ i ];

	n = ( f instanceof THREE.Face3 ) ? 3 : 4;

	for( var j = 0; j < n; j++ ) {

	    vertexIndex = f[ faceIndices[ j ] ];

	    p = geometry.vertices[ vertexIndex ];

	    color = new THREE.Color( 0xffffff );
	    color.setHSL( ( p.y / radius + 1 ) / 2, 1.0, 0.5 );

	    f.vertexColors[ j ] = color;

	    color = new THREE.Color( 0xffffff );
	    color.setHSL( 0.0, ( p.y / radius + 1 ) / 2, 0.5 );

	    f2.vertexColors[ j ] = color;

	    color = new THREE.Color( 0xffffff );
	    color.setHSL( 0.125 * vertexIndex/geometry.vertices.length, 1.0, 0.5 );

	    f3.vertexColors[ j ] = color;

	}

    }


    var materials = [
	new THREE.MeshLambertMaterial( { color: 0xFF0000, shading: THREE.FlatShading, vertexColors: THREE.VertexColors } ),
	new THREE.MeshBasicMaterial( { color: 0xFFFFFF, shading: THREE.FlatShading, wireframe: true, transparent: true } )
    ];
    group1 = THREE.SceneUtils.createMultiMaterialObject( geometry, materials );
    //g.scene.add( group1 );

*/