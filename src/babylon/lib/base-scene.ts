import {Engine} from "@babylonjs/core/Engines/engine";
import type {Scene} from "@babylonjs/core/scene";

import {
    Animatable,
    Color3, DefaultRenderingPipeline,
    DirectionalLight, Effect,
    FreeCamera,
    GlowLayer,
    HemisphericLight,
    PointLight, PostProcess, SSAORenderingPipeline
} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import '@babylonjs/loaders'
import './earcut.min.js'

export abstract class BaseScene {
    protected existCollision: any = null
    protected collisionWith: any = null
    protected dirLight: any = null
    protected engine: Engine;
    protected scene?: Scene;
    protected nfts?: any = null;
    protected options: {
        debug: boolean;
        customLoadingScreen?: any;
    };
    protected firstPerson = false;
    protected skeleton: any = null;
    protected idleAnim: Animatable | null = null;
    protected walkAnim: any = null;
    protected runAnim: any = null;
    protected sprintAnim: any = null;
    protected animationBlend = 0.005;
    protected mouseSensitivity = 0.005;
    protected cameraSpeed = 0.0075;
    protected walkSpeed = 0.004;
    protected runSpeed = 0.005;
    protected sprintSpeed = 0.008;
    protected speed = 0;
    protected mouseX = 0
    protected mouseY = 0;
    protected mouseMin = -35
    protected mouseMax = 45;
    protected deltaTime = 0;
    protected camera: any = null;
    protected character: any = null;
    protected target: any = null;
    protected main: any = null;
    protected shadowGenerator: any = null;
    protected helper: any = null;
    protected canvas: HTMLCanvasElement | any = null;

    constructor(
        canvas: HTMLCanvasElement, options: { debug: boolean; customLoadingScreen?: any } = {debug: false}) {
        this.canvas = canvas;
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            disableWebGL2Support: false,
        });
        this.options = options;
        if (options.customLoadingScreen) this.engine.loadingScreen = options.customLoadingScreen;
    }

    private resize = () => this.scene?.getEngine().resize();

    public dispose() {
        this.scene?.getEngine().dispose();
        window.removeEventListener("resize", this.resize);
    }

    public async initialize({setIsShowModal, setSelectedObjectName, setIsShowInfoModal}: {
            setIsShowModal: (_?: any) => void,
            setSelectedObjectName: (_?: any) => void,
            setIsShowInfoModal: (_?: any) => void
        }
    ) {
        this.engine.displayLoadingUI();
        this.scene = await this.createScene({
            engine: this.engine,
            setIsShowModal: setIsShowModal,
            setSelectedObjectName: setSelectedObjectName,
            setIsShowInfoModal: setIsShowInfoModal
        });
        window.addEventListener("resize", this.resize);
        this.engine.runRenderLoop(this.render);
    }

    public createCamera = (scene: Scene) => {
        const camera = new FreeCamera(
            "camera",
            new Vector3(0, 1, 0),
            scene
        );
        camera.inputs.clear();
        camera.minZ = 0;
        camera.attachControl();
        return camera;
    };

    public createPostEffects = (scene: Scene) => {
        const gl = new GlowLayer("gl", scene);
        gl.intensity = 0.5;
        const pipeline = new DefaultRenderingPipeline(
            "pipeline",
            true,
            scene,
            [this.camera]
        );
        pipeline.samples = 4;

        new SSAORenderingPipeline(
            "ssaopipeline",
            scene,
            {
                ssaoRatio: 0.75,
                combineRatio: 1.0,
            },
            [this.camera]
        );

        new PostProcess(
            "postProcess",
            "anamorphicEffects",
            [],
            null,
            1,
            this.camera
        );
    }

    public createLight = (scene: Scene): [HemisphericLight, DirectionalLight, PointLight] => {
        const hemLight = new HemisphericLight(
            "light1",
            new Vector3(0, 1, 0),
            scene
        );
        hemLight.intensity = 0.7;
        hemLight.specular = Color3.Black();
        // @ts-ignore
        hemLight.groundColor = scene.clearColor.scale(0.75);

        const dirLight = new DirectionalLight(
            "dir01",
            new Vector3(0, -0.5, -1.0),
            scene
        );
        this.dirLight = dirLight
        dirLight.position = new Vector3(0, 130, 130);

        const smallLight = new PointLight(
            "boxLight",
            new Vector3(0, 0, 0),
            this.scene
        );
        smallLight.diffuse = new Color3(0.3, 0.5, 0.8);
        smallLight.specular = smallLight.specular;
        smallLight.intensity = 1;
        smallLight.range = 5;

        return [hemLight, dirLight, smallLight]
    };

    abstract createScene: ({
                               engine,
                               setIsShowModal,
                               setSelectedObjectName,
                               setIsShowInfoModal
                           }: {
        engine: Engine,
        setIsShowModal: (_?: any) => void,
        setSelectedObjectName: (_?: any) => void,
        setIsShowInfoModal: (_?: any) => void
    }) => Scene | Promise<Scene>;



    abstract setupPointerLock: () => void;

    render = () => {
        if (!this.scene) throw new Error("initialize() should be called before calling render()");
        this.scene.render();
    };
}

Effect.ShadersStore["anamorphicEffectsFragmentShader"] = `
              #ifdef GL_ES
                  precision highp float;
              #endif

              // Samplers
              varying vec2 vUV;
              uniform sampler2D textureSampler;

              float NoiseSeed;
              float randomFloat(){
              NoiseSeed = sin(NoiseSeed) * 84522.13219145687;
              return fract(NoiseSeed);
              }

              float SCurve (float value, float amount, float correction) {

                  float curve = 1.0;

                  if (value < 0.5){
                              curve = pow(value, amount) * pow(2.0, amount) * 0.5;
                  }else{
                      curve = 1.0 - pow(1.0 - value, amount) * pow(2.0, amount) * 0.5;
                  }

                  return pow(curve, correction);
              }


              //ACES tonemapping from: https://www.shadertoy.com/view/wl2SDt
              vec3 ACESFilm(vec3 x)
              {
                  float a = 2.51;
                  float b = 0.03;
                  float c = 2.43;
                  float d = 0.59;
                  float e = 0.14;
                  return (x*(a*x+b))/(x*(c*x+d)+e);
              }


              //Chromatic Abberation from: https://www.shadertoy.com/view/XlKczz
              vec3 chromaticAbberation(sampler2D tex, vec2 uv, float amount, float radius)
              {
                  float aberrationAmount = amount/10.0;
                  vec2 distFromCenter = uv - 0.5;

                  // stronger aberration near the edges by raising to power 3
                  vec2 aberrated = aberrationAmount * pow(distFromCenter, vec2(radius));

                  vec3 color = vec3(0.0);

                  for (int i = 1; i <= 8; i++)
                  {
                      float weight = 1.0 / pow(2.0, float(i));
                      color.r += texture2D(tex, uv - float(i) * aberrated).r * weight;
                      color.b += texture2D(tex, uv + float(i) * aberrated).b * weight;
                  }

                  color.g = texture2D(tex, uv).g * 0.9961; // 0.9961 = weight(1)+weight(2)+...+weight(8);

                  return color;
              }


              //film grain from: https://www.shadertoy.com/view/wl2SDt
              vec3 filmGrain()
              {
                  return vec3(0.9 + randomFloat()*0.15);
              }


              //Sigmoid Contrast from: https://www.shadertoy.com/view/MlXGRf
              vec3 contrast(vec3 color)
              {
                  return vec3(
                      SCurve(color.r, 3.0, 1.0),
                      SCurve(color.g, 4.0, 0.7),
                      SCurve(color.b, 2.6, 0.6)
                  );
              }


              //anamorphic-ish flares from: https://www.shadertoy.com/view/MlsfRl
              vec3 flares(sampler2D tex, vec2 uv, float threshold, float intensity, float stretch, float brightness)
              {
                  threshold = 1.0 - threshold;

                  vec3 hdr = texture2D(tex, uv).rgb;
                  hdr = vec3(floor(threshold+pow(hdr.r, 1.0)));

                  float d = intensity; //200.;
                  float c = intensity*stretch; //100.;

                  //horizontal
                  for (float i=c; i>-1.0; i--)
                  {
                      float texL = texture2D(tex, uv+vec2(i/d, 0.0)).r;
                      float texR = texture2D(tex, uv-vec2(i/d, 0.0)).r;
                      hdr += floor(threshold+pow(max(texL,texR), 4.0))*(1.0-i/c);
                  }

                  hdr *= vec3(0.1,0.1,1.0); //tint

                  return hdr*brightness;
              }


              //glow from: https://www.shadertoy.com/view/XslGDr (unused but useful)
              vec3 samplef(vec2 tc, vec3 color)
              {
                  return pow(color, vec3(2.2, 2.2, 2.2));
              }

              vec3 highlights(vec3 pixel, float thres)
              {
                  float val = (pixel.x + pixel.y + pixel.z) / 3.0;
                  return pixel * smoothstep(thres - 0.1, thres + 0.1, val);
              }

              vec3 hsample(vec3 color, vec2 tc)
              {
                  return highlights(samplef(tc, color), 0.6);
              }

              vec3 blur(vec3 col, vec2 tc, float offs)
              {
                  vec4 xoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0);
                  vec4 yoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0);

                  vec3 color = vec3(0.0, 0.0, 0.0);
                  color += hsample(col, tc + vec2(xoffs.x, yoffs.x)) * 0.00366;
                  color += hsample(col, tc + vec2(xoffs.y, yoffs.x)) * 0.01465;
                  color += hsample(col, tc + vec2(    0.0, yoffs.x)) * 0.02564;
                  color += hsample(col, tc + vec2(xoffs.z, yoffs.x)) * 0.01465;
                  color += hsample(col, tc + vec2(xoffs.w, yoffs.x)) * 0.00366;

                  color += hsample(col, tc + vec2(xoffs.x, yoffs.y)) * 0.01465;
                  color += hsample(col, tc + vec2(xoffs.y, yoffs.y)) * 0.05861;
                  color += hsample(col, tc + vec2(    0.0, yoffs.y)) * 0.09524;
                  color += hsample(col, tc + vec2(xoffs.z, yoffs.y)) * 0.05861;
                  color += hsample(col, tc + vec2(xoffs.w, yoffs.y)) * 0.01465;

                  color += hsample(col, tc + vec2(xoffs.x, 0.0)) * 0.02564;
                  color += hsample(col, tc + vec2(xoffs.y, 0.0)) * 0.09524;
                  color += hsample(col, tc + vec2(    0.0, 0.0)) * 0.15018;
                  color += hsample(col, tc + vec2(xoffs.z, 0.0)) * 0.09524;
                  color += hsample(col, tc + vec2(xoffs.w, 0.0)) * 0.02564;

                  color += hsample(col, tc + vec2(xoffs.x, yoffs.z)) * 0.01465;
                  color += hsample(col, tc + vec2(xoffs.y, yoffs.z)) * 0.05861;
                  color += hsample(col, tc + vec2(    0.0, yoffs.z)) * 0.09524;
                  color += hsample(col, tc + vec2(xoffs.z, yoffs.z)) * 0.05861;
                  color += hsample(col, tc + vec2(xoffs.w, yoffs.z)) * 0.01465;

                  color += hsample(col, tc + vec2(xoffs.x, yoffs.w)) * 0.00366;
                  color += hsample(col, tc + vec2(xoffs.y, yoffs.w)) * 0.01465;
                  color += hsample(col, tc + vec2(    0.0, yoffs.w)) * 0.02564;
                  color += hsample(col, tc + vec2(xoffs.z, yoffs.w)) * 0.01465;
                  color += hsample(col, tc + vec2(xoffs.w, yoffs.w)) * 0.00366;

                  return color;
              }

              vec3 glow(vec3 col, vec2 uv)
              {
                  vec3 color = blur(col, uv, 2.0);
                  color += blur(col, uv, 3.0);
                  color += blur(col, uv, 5.0);
                  color += blur(col, uv, 7.0);
                  color /= 4.0;

                  color += samplef(uv, col);

                  return color;
              }


              //margins from: https://www.shadertoy.com/view/wl2SDt
              vec3 margins(vec3 color, vec2 uv, float marginSize)
              {
                  if(uv.y < marginSize || uv.y > 1.0-marginSize)
                  {
                      return vec3(0.0);
                  }else{
                      return color;
                  }
              }


              void main(void) {

                  //margins
                  float marginSize = 0.1;
                  if(vUV.y < marginSize || vUV.y > 1.0-marginSize){
                      gl_FragColor = vec4(vec3(0.0), 1.0);
                      return;
                  }

                  vec3 color = vec3(0.0);
                  color = texture2D(textureSampler, vUV).rgb;

                  //chromatic abberation
                  color = chromaticAbberation(textureSampler, vUV, 0.8, 4.0);

                  //film grain
                  color *= filmGrain();

                  //glow (not bloom)
                  //color = glow(color, vUV);

                  //contrast
                  //color = contrast(color) * 0.9;

                  //flare
                  color += flares(textureSampler, vUV, 0.5, 200.0, 0.4, 0.01);

                  //ACES Tonemapping
                  color = ACESFilm(color);

                  gl_FragColor = vec4(color, 1.0);
              }
          `;
