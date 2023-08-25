import type {Engine} from "@babylonjs/core/Engines/engine";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Scene} from "@babylonjs/core/scene";
import {
    Animatable,
    AssetsManager,
    Color3,
    DeviceSourceManager,
    DeviceType,
    DynamicTexture,
    Mesh,
    MeshBuilder,
    SceneLoader,
    ShadowGenerator,
    StandardMaterial,
    Texture,
    Tools,
    TransformNode
} from "@babylonjs/core";
import {clamp, firstPersonCamera, lerp, lerp3, thirdPersonCamera} from "../lib/utils";
import {
    coordinates,
    coordinatesWithInteraction,
    fencesCoodinates,
    lampCoordinates,
    picturesCoordonates,
    sculptureCoordonates
} from "../lib/constants.ts";
import {BaseScene} from "../lib/base-scene.ts";
import {ethers} from "ethers";
import {
    CONTRACT_ABI,
    CONTRACT_ABI_2,
    CONTRACT_ADDRES,
    CONTRACT_ADDRESS_2,
    IPFS_URL,
    RPC_URL
} from "../../utils/contants.tsx";

export class HomeScene extends BaseScene {
    startRenderLoop = ({engine, scene, setIsShowInfoModal}: {
        engine: Engine,
        scene: Scene,
        setIsShowInfoModal: (_?: any) => void
    }) => {
        engine.runRenderLoop(() => {
            if (scene && scene.activeCamera) scene.render();
            this.existCollision = false;
            // console.log(this.main?.position)
            for (let i = 0; i < coordinatesWithInteraction.length; i++) {
                if (this.main.position._x >= coordinatesWithInteraction[i].x_min && this.main.position._x <= coordinatesWithInteraction[i].x_max) {
                    if (this.main.position._z >= coordinatesWithInteraction[i].z_min && this.main.position._z <= coordinatesWithInteraction[i].z_max) {
                        this.existCollision = true;
                        setIsShowInfoModal(true)
                        if (this.nfts && this.nfts[i])
                            console.log(this.nfts[i])
                        this.collisionWith = {
                            ...coordinatesWithInteraction[i],
                            ...((this.nfts && this.nfts[i]) ? {...this.nfts[i]} : {}),
                        };
                        break;
                    } else {
                        this.existCollision = false
                        setIsShowInfoModal(false)
                    }
                } else {
                    this.existCollision = false
                    setIsShowInfoModal(false)
                }
            }
        });
    };

    createEnv = (scene: Scene) => {
        const helper = scene.createDefaultEnvironment({
            enableGroundShadow: true,
            enableGroundMirror: true,
            groundMirrorFallOffDistance: 0,
            groundSize: 70,
            skyboxSize: 70,
        });
        helper!.setMainColor(scene.fogColor);
        helper!.groundMaterial!.diffuseTexture = null;
        helper!.groundMaterial!.alpha = 1;
        helper!.groundMaterial!.fogEnabled = true;
        helper!.ground!.checkCollisions = true;
        helper!.skybox!.checkCollisions = true;
        return helper
    }

    addShadows = (mesh: Mesh) => {
        mesh.receiveShadows = true;
        this.shadowGenerator.addShadowCaster(mesh);
    };

    addToMirror = (mesh: Mesh) => {
        this.helper.groundMirrorRenderList.push(mesh);
    };

    registerBeforeRender = (engine: Engine) => {
        const dsm = new DeviceSourceManager(engine);
        this.deltaTime = engine.getDeltaTime();
        this.target.rotation = lerp3(
            this.target.rotation,
            new Vector3(
                Tools.ToRadians(this.mouseY),
                Tools.ToRadians(this.mouseX),
                0
            ),
            this.cameraSpeed * this.deltaTime
        );

        if (this.character != null) {
            const keyboard = dsm.getDeviceSource(DeviceType.Keyboard);
            if (keyboard) {
                if (this.firstPerson == true) {
                    this.firstPersonMovement(
                        keyboard.getInput(87), //W
                        keyboard.getInput(83), //S
                        keyboard.getInput(65), //A
                        keyboard.getInput(68), //D
                        keyboard.getInput(16), //Shift
                    );
                } else {
                    this.thirdPersonMovement(
                        keyboard.getInput(87), //W
                        keyboard.getInput(83), //S
                        keyboard.getInput(65), //A
                        keyboard.getInput(68), //D
                        keyboard.getInput(16), //Shift
                    );
                }
            }
        }
    }

    importAvatar = ({scene, smallLight}: { scene: Scene, smallLight: any }) => {
        SceneLoader.ImportMesh(
            "",
            "",
            './models/ybot.babylon',
            scene,
            (newMeshes, _, skeletons) => {
                this.skeleton = skeletons[0];
                const body = newMeshes[1];
                const joints = newMeshes[0];
                body.scaling = new Vector3(0.01, 0.01, 0.01);
                body.rotation.y = Tools.ToRadians(180);
                joints.parent = body;
                body.parent = this.character;
                body.material = new StandardMaterial("character", scene);
                joints.material = new StandardMaterial("joints", scene);
                // @ts-ignore
                body.material.diffuseColor = new Color3(0.81, 0.24, 0.24);
                // @ts-ignore
                joints.material.emissiveColor = new Color3(0.19, 0.29, 0.44);
                this.addToMirror(this.character);
                this.addShadows(this.character);

                const idleRange = this.skeleton.getAnimationRange("None_Idle");
                const walkRange = this.skeleton.getAnimationRange("None_Walk");
                const runRange = this.skeleton.getAnimationRange("None_Run");
                const sprintRange = this.skeleton.getAnimationRange("None_Sprint");

                this.idleAnim = scene.beginWeightedAnimation(
                    this.skeleton,
                    idleRange.from + 1,
                    idleRange.to,
                    1.0,
                    true
                );
                this.walkAnim = scene.beginWeightedAnimation(
                    this.skeleton,
                    walkRange.from + 1,
                    walkRange.to,
                    0,
                    true
                );
                this.runAnim = scene.beginWeightedAnimation(
                    this.skeleton,
                    runRange.from + 1,
                    runRange.to,
                    0,
                    true
                );
                this.sprintAnim = scene.beginWeightedAnimation(
                    this.skeleton,
                    sprintRange.from + 1,
                    sprintRange.to,
                    0,
                    true
                );

                this.main.ellipsoid = new Vector3(0.5, 0.9, 0.5);
                this.main.ellipsoidOffset = new Vector3(0, this.main.ellipsoid.y, 0);
                this.main.checkCollisions = true;

                smallLight.parent = this.main;
                this.character.parent = this.main;
                this.target.parent = this.main;

                if (this.firstPerson == true) {
                    this.camera.parent = this.character;
                    this.switchCamera(firstPersonCamera.middle);
                } else {
                    this.camera.parent = this.target;
                    this.switchCamera(thirdPersonCamera.leftRun);
                }

                this.main.position = new Vector3(8, 0, 7);
            },
            () => {
            }
        );
    }

    setImages = (nfts: any) => {
        console.log(nfts)
        for (let i = 0; i < coordinates.length; i++) {
            this.createImagePlane(
                coordinates[i].xp,
                coordinates[i].yp,
                coordinates[i].zp,
                coordinates[i].xr,
                coordinates[i].yr,
                coordinates[i].zr,
                this.scene!,
                this.shadowGenerator,
                nfts[i]?.image,
                i,
                nfts?.length
            )

            this.showDataDescriptionOrLoading(
                {
                    scene: this.scene!,
                    txt: nfts[i]?.name ?? '',
                    position: new Vector3(
                        coordinates[i].xp,
                        coordinates[i].yp + 0.5,
                        coordinates[i].zp
                    ),
                    rotation: {
                        xr: coordinates[i].xr,
                        yr: coordinates[i].yr,
                        zr: coordinates[i].zr
                    },
                })
        }
    }

    createFences = () => {
        SceneLoader.ImportMesh(
            "",
            "./models/",
            "fence_wood.glb",
            this.scene,
            (newMeshes) => {
                const daeHouse = MeshBuilder.CreateBox("fence_base", {size: 0.0001});
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].setParent(daeHouse)
                    newMeshes[i].checkCollisions = true;
                }

                const fences = []
                daeHouse.position.y = fencesCoodinates[0].y
                daeHouse.position.x = fencesCoodinates[0].x
                daeHouse.position.z = fencesCoodinates[0].z
                daeHouse.rotation.y = fencesCoodinates[0].rotation

                for (let i = 1; i < fencesCoodinates?.length; i++) {
                    fences.push(daeHouse.clone(`fence-${i}`))
                    daeHouse.position.y = fencesCoodinates[i].y
                    daeHouse.position.x = fencesCoodinates[i].x
                    daeHouse.position.z = fencesCoodinates[i].z
                    daeHouse.rotation.y = fencesCoodinates[i].rotation
                }
            });
    }

    ImportBuilds = (scene: Scene) => {
        const chineseHouse = MeshBuilder.CreateBox("chinese-house1", {size: 0.0001});
        SceneLoader.ImportMesh("", "./models/", "chinese.glb", scene, (newMeshes) => {
            for (let i = 0; i < newMeshes?.length; i++) {
                newMeshes[i].setParent(chineseHouse)
                newMeshes[i].isPickable = true;
                newMeshes[i].checkCollisions = true;
            }
            chineseHouse.position.y = -0.05
            chineseHouse.position.x = -25
            chineseHouse.position.z = -27

            const chineseHouse2 = chineseHouse.clone("chinese-house2");
            chineseHouse2.position.y = -0.05
            chineseHouse2.position.x = 25
            chineseHouse2.position.z = 25

            const chineseHouse3 = chineseHouse.clone("chinese-house3");
            chineseHouse3.position.y = -0.05
            chineseHouse3.position.x = -25
            chineseHouse3.position.z = 27
        });


        SceneLoader.ImportMesh(
            "",
            "./models/",
            "dae_house.glb",
            scene,
            (newMeshes) => {
                const daeHouse = MeshBuilder.CreateBox("dae-house");
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].setParent(daeHouse)
                    newMeshes[i].checkCollisions = true;
                }
                daeHouse.position.y = 0.1
                daeHouse.position.x = 0
                daeHouse.position.z = 25
                daeHouse.rotation.y = Math.PI
            });

        SceneLoader.ImportMesh(
            "",
            "./models/",
            "japanese_lamp.glb",
            scene,
            (newMeshes) => {
                const daeHouse = MeshBuilder.CreateBox("dae-house2", {size: 0.0001});

                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].setParent(daeHouse)
                    newMeshes[i].checkCollisions = true;
                }

                daeHouse.scaling = new Vector3(0.015, 0.015, 0.015);
                daeHouse.position.y = lampCoordinates[0].y
                daeHouse.position.x = lampCoordinates[0].x
                daeHouse.position.z = lampCoordinates[0].z
                daeHouse.rotation.y = lampCoordinates[0].rotation

                this.createPlaneText(lampCoordinates[0].text, new Vector3(
                    lampCoordinates[0].x,
                    lampCoordinates[0].y + 1.7,
                    lampCoordinates[0].z,
                ), lampCoordinates[0].rotation)

                const lamps = []

                for (let i = 1; i < lampCoordinates?.length; i++) {
                    lamps.push(daeHouse.clone(`lamp-${i}`))
                    daeHouse.position.y = lampCoordinates[i].y
                    daeHouse.position.x = lampCoordinates[i].x
                    daeHouse.position.z = lampCoordinates[i].z
                    daeHouse.rotation.y = lampCoordinates[i].rotation

                    this.createPlaneText(lampCoordinates[i].text, new Vector3(
                        lampCoordinates[i].x,
                        lampCoordinates[i].y + 1.7,
                        lampCoordinates[i].z,
                    ), lampCoordinates[i].rotation)
                }
            });


        SceneLoader.ImportMesh(
            "",
            "./models/",
            "chinese_ancient_building.glb",
            scene,
            (newMeshes) => {
                const chineseAncient = MeshBuilder.CreateBox("chinese-ancient", {size: 0.0001});

                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].checkCollisions = true;
                    newMeshes[i].setParent(chineseAncient)
                }
                chineseAncient.position.y = -0.05
                chineseAncient.position.x = 15
                chineseAncient.position.z = -20

                const chineseHouse2 = chineseAncient.clone("chinese-ancient2");
                chineseHouse2.position.y = -0.05
                chineseHouse2.position.x = -25
                chineseHouse2.position.z = 0
                chineseHouse2.rotation.y = Math.PI / 2
            });

        this.createFences()
        this.CreateShiba(scene)
    }

    loadTestModel = async (scene) => {
        return new Promise((resolve, reject) => {
            // let setOfLoadedPieces: any[any] = [];

            const assetsManager = new AssetsManager(scene);

            const meshTask1 = assetsManager.addMeshTask(
                "",
                "",
                "./models/test/",
                "modern_building_-_gallery_-_office.glb",
            );

            meshTask1.onSuccess = async function (task) {

                //   let modelMergeArray = []


                const modelTask = task.loadedMeshes

                for (const el of modelTask) {
                    // modelMergeArray.push(el)
                    // el.scaling.x = .25
                    // el.scaling.y = .25
                    // el.scaling.z = .25
                    // el.metadata.groupBy = {}
                }

                // find((model) => model.name === "skullBoi")!;

                // skullBoiMerge.push(skullBoi2)

                // for (const el of skullBoiMerge)

                // skullBoi2.position = new Vector3(1, 0, -3.75);
                // skullBoi2.position.y = 1;
                // skullBoi2.scaling.x = .25
                // skullBoi2.scaling.y = .25
                // skullBoi2.scaling.z = .25
                // skullBoi2.rotationQuaternion = null;
                // skullBoi2.rotation = new Vector3(0, 0, 0);
                // skullBoi2.rotation.y = deg(0);
                // inputScene.beginAnimation(inputScene.skeletons[0], 0, 80, true, 1.0);
                //   console.log(modelMergeArray)
                // console.log9
                // console.log

                //   const mergedModel = Mesh.MergeMeshes(modelMergeArray, true)
                //   console.log('merged', mergedModel)

                resolve(modelTask);
            };
            assetsManager.load();
        });
    }


    enbleSculpture = (index) => {
        this.scene?.meshes?.find(item => item?.name === `fence-${index}`)!
            .setEnabled((this.scene?.meshes?.find(item => item?.name === `fence-${index}`)!.isEnabled() ? false : true));

    }

    createPicture = () => {
        // if (this.scene?.meshes?.filter(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)?.length === 1) {
        //     this.scene?.meshes?.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!.dispose()
        //     this.scene?.removeMesh(this.scene.meshes.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!)
        // }


        SceneLoader.ImportMesh(
            "",
            "./models/test/",
            "picture_frame.glb",
            this.scene,
            (newMeshes) => {
                const daeHouse = MeshBuilder.CreateBox("picture_0", {size: 0.0001});
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].parent = daeHouse
                    newMeshes[i].checkCollisions = true;
                    newMeshes[i].scaling = new Vector3(0.01, 0.01, 0.01);
                }

                const fences = []
                daeHouse.position.y = picturesCoordonates[0].y
                daeHouse.position.x = picturesCoordonates[0].x
                daeHouse.position.z = picturesCoordonates[0].z
                daeHouse.rotation.x = picturesCoordonates[0].xr
                daeHouse.rotation.z = picturesCoordonates[0].zr
                daeHouse.rotation.z = picturesCoordonates[0].yr
                // daeHouse.setEnabled(false);


                // for (let i = 1; i < sculptureCoordonates?.length; i++) {
                //     fences.push(daeHouse.clone(`fence-${i}`))
                //     daeHouse.position.y = sculptureCoordonates[i].y
                //     daeHouse.position.x = sculptureCoordonates[i].x
                //     daeHouse.position.z = sculptureCoordonates[i].z
                //     daeHouse.rotation.x = sculptureCoordonates[i].xr
                //     daeHouse.rotation.z = sculptureCoordonates[i].zr
                //     // daeHouse.setEnabled((daeHouse.isEnabled() ? false : true));
                //     daeHouse.setEnabled(false);
                // }
            });


    }

    shortidSculpture = () => {
        // if (this.scene?.meshes?.filter(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)?.length === 1) {
        //     this.scene?.meshes?.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!.dispose()
        //     this.scene?.removeMesh(this.scene.meshes.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!)
        // }


        SceneLoader.ImportMesh(
            "",
            "./models/test/",
            "sculpture_bust_of_roza_loewenfeld.glb",
            this.scene,
            (newMeshes) => {
                const daeHouse = MeshBuilder.CreateBox("fence_base", {size: 0.0001});
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].isPickable = true;
                    newMeshes[i].parent = daeHouse
                    newMeshes[i].checkCollisions = true;
                    newMeshes[i].scaling = new Vector3(0.005, 0.005, 0.005);
                }

                const fences = []
                daeHouse.position.y = sculptureCoordonates[0].y
                daeHouse.position.x = sculptureCoordonates[0].x
                daeHouse.position.z = sculptureCoordonates[0].z
                daeHouse.rotation.x = sculptureCoordonates[0].xr
                daeHouse.rotation.z = sculptureCoordonates[0].zr
                daeHouse.setEnabled(false);


                for (let i = 1; i < sculptureCoordonates?.length; i++) {
                    fences.push(daeHouse.clone(`fence-${i}`))
                    daeHouse.position.y = sculptureCoordonates[i].y
                    daeHouse.position.x = sculptureCoordonates[i].x
                    daeHouse.position.z = sculptureCoordonates[i].z
                    daeHouse.rotation.x = sculptureCoordonates[i].xr
                    daeHouse.rotation.z = sculptureCoordonates[i].zr
                    // daeHouse.setEnabled((daeHouse.isEnabled() ? false : true));
                    daeHouse.setEnabled(false);
                }
            });

        // SceneLoader.ImportMesh(
        //     "",
        //     "./models/test/",
        //     "sculpture_bust_of_roza_loewenfeld.glb",
        //     this.scene,
        //     (newMeshes,x ,skeletons) => {
        //         console.log(x)
        //         console.log(skeletons)
        //         console.log(newMeshes)
        //         const daeHouse = MeshBuilder.CreateBox("dae-house", {size: 0.0001});
        //         for (let i = 0; i < newMeshes?.length; i++) {
        //             // newMeshes[i].isPickable = true;
        //             // newMeshes[i].checkCollisions = true;
        //             newMeshes[i].parent = daeHouse
        //             newMeshes[i].scaling = new Vector3(0.005, 0.005, 0.005);
        //         }
        //         daeHouse.rotation.x = Math.PI / 0.66
        //         daeHouse.rotation.z = Math.PI
        //         daeHouse.position.y = 1.5
        //         daeHouse.position.x = -2.2
        //         daeHouse.position.z = 8
        //
        //         // daeHouse.position.y = 0.1
        //         // daeHouse.position.x = 0
        //         // daeHouse.position.z = 0
        //         // daeHouse.rotation.y = Math.PI
        //     });
    }

    createPictureImage = (xp: any, yp: any, zp: any, xr: any, yr: any, zr: any, image = './back.jpg', index) => {
        const img = new Image();
        img.src = image;
        img.onload = function () {
            const height = img.height;
            const width = img.width;
            const plane = MeshBuilder.CreatePlane("1plane1" + xp, {
                height: 3,
                width: Math.min(3 * width / height, 4)
            }, this.scene);
            const mat = new StandardMaterial("1plane2", this.scene);
            mat.diffuseTexture = new Texture(image, this.scene);
            plane.material = mat;
            plane.rotation = new Vector3(xr, yr + Math.PI * 2.5, zr);
            plane.position.x = xp + 2
            plane.position.y = yp + 2.5
            plane.position.z = zp

            plane.parent = this.scene?.meshes?.filter(item => item?.name === `picture-${index}`)!
        }

        img.onerror = function () {
            const img2 = new Image();
            img2.src = './back.jpg';
            img2.onload = function () {
                const height = img.height;
                const width = img.width;
                const plane = MeshBuilder.CreatePlane("1plane1" + xp, {
                    height: 3,
                    width: 3 * width / height
                }, this.scene);
                const mat = new StandardMaterial("1plane2", this.scene);
                mat.diffuseTexture = new Texture(image, this.scene);
                plane.material = mat;
                plane.rotation = new Vector3(xr, yr + Math.PI / 3, zr);
                plane.position.x = xp
                plane.position.y = yp + 2
                plane.position.z = zp

                plane.parent = this.scene?.meshes?.filter(item => item?.name === `picture-${index}`)!

            }
        }
    }

    importRoom = async (scene) => {
        // const testModel = await this.loadTestModel()
        // console.log(testModel)
        // const m = testModel.slice(1);
        //
        // const mergedModel = Mesh.MergeMeshes(testModel, true)
        //
        // mergedModel.position.y = 20
        // mergedModel.checkCollisions = true
        // mergedModel.isPickable = true
        SceneLoader.ImportMesh(
            "",
            "./models/test/",
            "vr_art_gallery_2023.glb",
            scene,
            (newMeshes, x, skeletons) => {
                console.log(x)
                console.log(skeletons)
                console.log(newMeshes)
                const daeHouse = MeshBuilder.CreateBox("dae-house");
                for (let i = 0; i < newMeshes?.length; i++) {
                    // newMeshes[i].isPickable = true;
                    // newMeshes[i].checkCollisions = true;

                    newMeshes[i].position.y = 0.001
                    newMeshes[i].position.x = 0
                    newMeshes[i].position.z = 0
                    // newMeshes[i].scaling = new Vector3(0.5, 0.5, 0.5);
                }
                // daeHouse.position.y = 0.1
                // daeHouse.position.x = 0
                // daeHouse.position.z = 0
                // daeHouse.rotation.y = Math.PI
            });
        this.shortidSculpture()
        // this.createPicture()


        // SceneLoader.ImportMesh(
        //     "",
        //     "./models/test/",
        //     "chest.glb",
        //     scene,
        //     (newMeshes,x ,skeletons) => {
        //         console.log(x)
        //         console.log(skeletons)
        //         console.log(newMeshes)
        //         const daeHouse = MeshBuilder.CreateBox("dae-house");
        //         for (let i = 0; i < newMeshes?.length; i++) {
        //             // newMeshes[i].isPickable = true;
        //             // newMeshes[i].checkCollisions = true;
        //             newMeshes[i].position.y = 0
        //             newMeshes[i].position.x = 5.7
        //             newMeshes[i].position.z = -8.2
        //             newMeshes[i].scaling = new Vector3(0.05, 0.05, 0.05);
        //         }
        //         // daeHouse.position.y = 0.1
        //         // daeHouse.position.x = 0
        //         // daeHouse.position.z = 0
        //         // daeHouse.rotation.y = Math.PI
        //     });

        // sculpture_bust_of_roza_loewenfeld

        // var street = null;
        // SceneLoader.ImportMesh(
        //     "",
        //     "./models/test/",
        //     "modern_building_-_gallery_-_office.glb",
        //     scene,
        //     (newMeshes) => {
        //         for (let i = 0; i < newMeshes?.length; i++) {
        //             // newMeshes[i].isPickable = true;
        //             // newMeshes[i].checkCollisions = true;
        //
        //
        //             // newMeshes[i].scaling = new Vector3(.15, .15, .15);
        //         }
        //
        //         const m = newMeshes.slice(1);
        //
        //         street = Mesh.MergeMeshes(
        //             // @ts-ignore
        //             m,
        //             true,
        //         );
        //         // street.scaling = new Vector3(11.2, 11.2, 11.2);
        //         street.position.y = 20
        //         street.checkCollisions = true;
        //         this.engine.hideLoadingUI();
        //     }
        // );
    }

    createScene = async ({engine, setIsShowModal, setSelectedObjectName, setIsShowInfoModal}: {
        engine: Engine,
        setIsShowModal: (_?: any) => void,
        setSelectedObjectName: (_?: any) => void,
        setIsShowInfoModal: (_?: any) => void
    }) => {
        this.firstPerson = true

        const scene = new Scene(engine);
        engine.displayLoadingUI();
        scene.collisionsEnabled = true;
        scene.gravity = new Vector3(0, -9.81, 0);
        scene.fogEnabled = true;
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.001;
        scene.fogColor = new Color3(0.8, 0.9, 1.0);
        // @ts-ignore
        scene.clearColor = scene.fogColor;

        this.camera = this.createCamera(scene);

        // @ts-ignore
        const [hemLight, dirLight, smallLight] = this.createLight(scene);

        this.shadowGenerator = new ShadowGenerator(3072, dirLight);
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.helper = this.createEnv(scene);

        this.main = new Mesh("parent", scene);
        this.target = new TransformNode("", undefined, undefined);
        this.character = new Mesh("character", scene);

        scene.registerBeforeRender(() => this.registerBeforeRender(engine));
        scene.detachControl();
        this.importRoom(scene);

        this.importAvatar({scene: scene, smallLight: smallLight})
        this.setupPointerLock();

        scene.onPointerDown = (evt) => {
            console.log(evt)
            if (document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock || false;
                if (this.canvas.requestPointerLock) {
                    this.canvas.requestPointerLock();
                }
            }

        };

        this.createPostEffects(scene)

        // const ground = MeshBuilder.CreateGround(
        //     "ground",
        //     {width: 70, height: 70},
        //     this.scene
        // );

        // ground.position.y = 0.001
        // ground.material = this.CreateGroundMaterial();

        // this.ImportBuilds(scene)
        this.engine.hideLoadingUI();

        document.onkeydown = (evt: any) => {
            evt = evt || window.event;
            let isPressedE = false;
            if ("key" in evt) {
                isPressedE = (evt.keyCode === 69);
            } else {
                isPressedE = (evt.keyCode === 69);
            }

            if (isPressedE && this.existCollision && (['mintPass', 'Chain', 'shiba', 'sculpture', 'picture']?.includes(this.collisionWith?.name) || this.collisionWith?.name?.includes('building'))) {
                if (['sculpture']?.includes(this.collisionWith?.name)) {
                    this.enbleSculpture(this.collisionWith?.id + 1)
                }
                setSelectedObjectName(this.collisionWith)
                setIsShowModal((prev: any) => {
                    if (!prev) this.engine.exitPointerlock()
                    return !prev
                })
            }
        };

        this.startRenderLoop({engine: this.engine, scene: this.scene!, setIsShowInfoModal})
        return scene;
    };

    setNewImage = (index, image) => {
        // if (this.scene?.meshes?.filter(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)?.length === 1) {
        //     this.scene?.meshes?.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!.dispose()
        //     this.scene?.removeMesh(this.scene.meshes.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!)
        // }
        console.log(this.scene?.materials?.map(item => item?.name))
        if (this.scene?.materials?.find(item => item?.name === `plane2${index}`)) {
            console.log(this.scene?.materials?.find(item => item?.name === `plane2${index}`))
            this.scene.materials.find(item => item?.name === `plane2${index}`)!.diffuseTexture = new Texture('https://corsproxy.xyz/' + image, this.scene);

        }
    }

    placeNft = async (index) => {
        const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const cRead = new ethers.Contract(CONTRACT_ADDRESS_2, CONTRACT_ABI_2, customHttpProvider);
        const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = metamaskProvider.getSigner();
        const address = await signer.getAddress()
        // console.log(address)
        const place = await cRead.placeNft(address, index)
        console.log(place)
        return place
    }

    createImagePlane = async (xp: any, yp: any, zp: any, xr: any, yr: any, zr: any, scene: Scene, shadowGenerator: ShadowGenerator, image = './back.jpg', index, length) => {
        console.log(index)

        const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const cRead = new ethers.Contract(CONTRACT_ADDRES, CONTRACT_ABI, customHttpProvider);
        const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = metamaskProvider.getSigner();
        const address = await signer.getAddress()
        const batchesCount = await cRead.balanceOf(address)
        console.log(parseInt(batchesCount))
        const d = await cRead.tokenOfOwnerByIndex(signer.getAddress(), parseInt(batchesCount) - 1)
        console.log(d)

        const x = await cRead.tokenURI(parseInt(d))
        const res = await fetch(IPFS_URL + x?.slice(7))
        const s = await res.json()
        console.log(index, s)

        console.log(index)

        if(index  + 1 < length) {

        const count = await this.placeNft(index + 1)
        console.log(count)
        }
        //     const d = await cRead.tokenOfOwnerByIndex(signer.getAddress(), parseInt(index + 1))

        // console.log(batchesCount)
        // const batchPromises = [];
        // for (let i = 0; i < length; i++) {
        //     batchPromises.push(cRead.tokenOfOwnerByIndex(signer.getAddress(), i));
        // }
        //
        // const batchInfos = await Promise.all(batchPromises);
        //
        // const data = []
        //
        // for (let i = 0; i < batchInfos?.length; i++) {
        //     const x = await cRead.tokenURI(batchInfos[i])
        //     const res = await fetch(IPFS_URL + x?.slice(7))
        //     const d = await res.json()
        //     data?.push(d)
        // }
        //
        // console.log(data)

        //
        // const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        // const cRead = new ethers.Contract(CONTRACT_ADDRES, CONTRACT_ABI, customHttpProvider);
        // const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        // const signer = metamaskProvider.getSigner();
        // const address = await signer.getAddress()
        // console.log(address)
        // const batchesCount = await cRead.tokenUri(address, 0)
        // return batchesCount

        try {
            const img = new Image();
            img.src = image;
            img.onload = function () {
                const height = img.height;
                const width = img.width;
                const plane = MeshBuilder.CreatePlane("plane1" + index, {
                    height: 3,
                    width: Math.min(3 * width / height, 4)
                }, scene);
                const mat = new StandardMaterial("plane2" + index, scene);
                mat.diffuseTexture = new Texture(image, scene);
                plane.material = mat;
                plane.rotation = new Vector3(xr, yr, zr);
                plane.position.x = xp
                plane.position.y = yp + 2.5
                plane.position.z = zp

                const box = MeshBuilder.CreateBox("box23" + index, {height: 15, width: 10, depth: 0.26});
                box.isPickable = true
                box.rotation = new Vector3(xr, yr, zr);
                if ((yr === 0 && xp > 0)
                    || (yr === Math.PI && xp > 0)
                    || (yr === 0 && xp < 0)
                    || (yr === Math.PI && xp < 0)
                ) {
                    box.position.x = xp
                    box.position.z = zp > 0 ? zp + 0.139 : zp - 0.139
                } else if ((yr === Math.PI / 2 && xp > 0)
                    || (yr === 3 * Math.PI / 2 && xp > 0)
                    || (yr === Math.PI / 2 && xp < 0)
                    || (yr === 3 * Math.PI / 2 && xp < 0)
                ) {
                    box.position.x = xp > 0 ? xp + 0.139 : xp - 0.139
                    box.position.z = zp
                }

                box.position.y = yp - 0.7
                box.checkCollisions = true;
                box.receiveShadows = true;
            }

            img.onerror = function () {
                const img2 = new Image();
                img2.src = './back.jpg';
                img2.onload = function () {
                    const height = img.height;
                    const width = img.width;
                    const plane = MeshBuilder.CreatePlane("plane1" + index, {
                        height: 3,
                        width: 3 * width / height
                    }, scene);
                    const mat = new StandardMaterial("plane2" + index, scene);
                    mat.diffuseTexture = new Texture(image, scene);
                    plane.material = mat;
                    plane.rotation = new Vector3(xr, yr, zr);
                    plane.position.x = xp
                    plane.position.y = yp + 2
                    plane.position.z = zp

                    const box = MeshBuilder.CreateBox("box23" + index, {height: 10, width: 4, depth: 0.26});
                    box.isPickable = true
                    box.rotation = new Vector3(xr, yr, zr);
                    if ((yr === 0 && xp > 0)
                        || (yr === Math.PI && xp > 0)
                        || (yr === 0 && xp < 0)
                        || (yr === Math.PI && xp < 0)
                    ) {
                        box.position.x = xp
                        box.position.z = zp > 0 ? zp + 0.139 : zp - 0.139
                    } else if ((yr === Math.PI / 2 && xp > 0)
                        || (yr === 3 * Math.PI / 2 && xp > 0)
                        || (yr === Math.PI / 2 && xp < 0)
                        || (yr === 3 * Math.PI / 2 && xp < 0)
                    ) {
                        box.position.x = xp > 0 ? xp + 0.139 : xp - 0.139
                        box.position.z = zp
                    }

                    box.position.y = yp - 0.8
                    box.checkCollisions = true;
                    box.receiveShadows = true;
                    shadowGenerator.addShadowCaster(box);
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    createPlaneText = async (text: string, position: Vector3, rotation: any) => {
        const fontData = await (await fetch("https://assets.babylonjs.com/fonts/Droid Sans_Regular.json")).json();
        if (this.scene?.meshes?.filter(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)?.length === 1) {
            this.scene?.meshes?.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!.dispose()
            this.scene?.removeMesh(this.scene.meshes.find(item => item?.name === `myText-${position.x}-${position.y}-${position.z}`)!)
        }

        const myText = MeshBuilder.CreateText(`myText-${position.x}-${position.y}-${position.z}`, text, fontData, {
            size: 0.4,
            resolution: 64,
            depth: 0.03,
        });

        // @ts-ignore
        const material = new StandardMaterial(this.scene!);
        material.alpha = 1;
        material.diffuseColor = new Color3(1, 0.5, 0);
        myText!.material = material;
        myText!.rotation.y = rotation
        myText!.position.y = position.y + 0.2
        myText!.position.x = position.x
        myText!.position.z = position.z
    }

    showDataDescriptionOrLoading = ({scene, txt, position, rotation, width = 4, fontSize}: {
        scene: Scene, txt: string, position: any, rotation: any, width?: number, fontSize?: any
    }) => {
        if (txt) {
            const planeWidth = width;
            const planeHeight = 0.7;
            const plane = MeshBuilder.CreatePlane("plane", {width: planeWidth, height: planeHeight,}, scene);
            const DTWidth = planeWidth * 1000;
            const DTHeight = planeHeight * 1000;
            plane.position = position
            plane.rotation.x = rotation.xr
            plane.rotation.y = rotation.yr
            plane.rotation.z = rotation.zr
            const text = txt;
            const dynamicTexture = new DynamicTexture("DynamicTexture", {width: DTWidth, height: DTHeight}, scene);
            const ctx = dynamicTexture.getContext();
            const size = 5;
            ctx.font = size + "px Arial";
            const textWidth = ctx.measureText(text.length <= 28 ? `${' '.repeat((28 - text.length) / 2)}${text}${' '.repeat((28 - text.length) / 2)}` : text).width;
            const ratio = textWidth / size;
            const font_size = fontSize ?? Math.floor(DTWidth / (ratio));
            const font = font_size + "px Arial";
            dynamicTexture.drawText(text, null, null, font, "#000000", "#ffffff", true);
            const mat = new StandardMaterial("mat", scene);
            mat.diffuseTexture = dynamicTexture;
            plane.material = mat;
        }
    }

    async CreateShiba(scene: Scene): Promise<void> {
        SceneLoader.ImportMesh(
            "",
            "./models/shiba/",

            "scene.gltf", scene,
            (newMeshes) => {
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].position.y = 1
                    newMeshes[i].position.x = 0
                    newMeshes[i].position.z = 0
                    newMeshes[i].isPickable = true
                    newMeshes[i].checkCollisions = true
                }
            });

        SceneLoader.ImportMesh("", "./models/",
            "shiba_coin.glb", scene, function (newMeshes) {
                for (let i = 0; i < newMeshes?.length; i++) {
                    newMeshes[i].position.y = 2
                    newMeshes[i].position.x = 0
                    newMeshes[i].position.z = 0
                    newMeshes[i].isPickable = true
                    newMeshes[i].checkCollisions = true
                    newMeshes[i].scaling = new Vector3(0.35, 0.35, 0.35);
                    if (newMeshes[i]?.id === '__root__') {
                        newMeshes[i].position.x = -1.5
                        newMeshes[i].position.z = -1.2
                    }
                    if (['Object_10', 'Object_9', 'Object_8', 'Object_12', 'Object_11'].includes(newMeshes[i]?.id)) {
                        newMeshes[i].dispose(true, true)
                    }
                }
            });
    }

    switchCamera = (type: { position: Vector3, fov: number, mouseMin: number, mouseMax: number }) => {
        this.camera.position = type.position.divide(this.camera.parent.scaling);
        this.camera.fov = type.fov;
        (this.mouseMin = type.mouseMin), (this.mouseMax = type.mouseMax);
    }

    firstPersonMovement = (up: number, down: number, left: number, right: number, run: number) => {
        const directionZ = up - down;
        const directionX = right - left;
        let vectorMove = new Vector3(0, 0, 0);
        const direction = Math.atan2(directionX, directionZ);
        let currentState = this.idleAnim;

        if (directionX != 0 || directionZ != 0) {
            if (up == 1) {
                if (run != 1) {
                    currentState = this.walkAnim;
                    this.speed = lerp(this.speed, this.walkSpeed, this.walkAnim.weight);
                } else {
                    currentState = this.runAnim;
                    this.speed = lerp(this.speed, this.runSpeed, this.runAnim.weight);
                }
            }
            vectorMove = new Vector3(
                Math.sin(this.target.rotation.y + direction - Tools.ToRadians(180)),
                0,
                Math.cos(this.target.rotation.y + direction - Tools.ToRadians(180))
            );
        }

        this.character.rotation.y = this.target.rotation.y - Tools.ToRadians(180);
        this.camera.rotation.x = this.target.rotation.x;
        const m = vectorMove.multiply(new Vector3().setAll(this.speed * this.deltaTime));
        this.main.moveWithCollisions(m.add(new Vector3(0, -0.09, 0)));
        this.switchAnimation(currentState);
    }

    thirdPersonMovement(up: number, down: number, left: number, right: number, run: number) {
        const directionZ = up - down;
        const directionX = right - left;

        let vectorMove = new Vector3(0, 0, 0);
        const direction = Math.atan2(directionX, directionZ);

        let currentState = this.idleAnim;

        if (directionX != 0 || directionZ != 0) {
            if (run != 1) {
                currentState = this.runAnim;
                this.speed = lerp(this.speed, this.runSpeed, this.runAnim.weight);
            } else {
                currentState = this.sprintAnim;
                this.speed = lerp(this.speed, this.sprintSpeed, this.sprintAnim.weight);
            }

            const rotation = (this.target.rotation.y + direction) % 360;
            this.character.rotation.y = lerp(this.character.rotation.y, rotation, 0.25);
            vectorMove = new Vector3(
                Math.sin(rotation),
                0,
                Math.cos(rotation)
            );
        } else {
            this.speed = lerp(this.speed, 0, 0.001);
        }

        const m = vectorMove.multiply(new Vector3().setAll(this.speed * this.deltaTime));
        this.main.moveWithCollisions(m.add(new Vector3(0, -0.09, 0)));
        this.switchAnimation(currentState);
    }

    switchAnimation = (anim: Animatable | null) => {
        const animations = [this.idleAnim, this.runAnim, this.walkAnim, this.sprintAnim];
        if (this.idleAnim != undefined) {
            for (var i = 0; i < animations.length; i++) {
                if (animations[i] == anim) {
                    animations[i].weight += this.animationBlend * this.deltaTime;
                } else {
                    animations[i].weight -= this.animationBlend * this.deltaTime;
                }
                animations[i].weight = clamp(animations[i].weight, 0.0, 1.0);
            }
        }
    }

    setupPointerLock = () => {
        const canvas = document.getElementById("renderCanvas");
        document.addEventListener("pointerlockchange", this.changeCallback, false);
        document.addEventListener(
            "mozpointerlockchange",
            this.changeCallback,
            false
        );
        document.addEventListener(
            "webkitpointerlockchange",
            this.changeCallback,
            false
        );

        if (canvas)
            canvas.onclick = () => {
                // @ts-ignore
                canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
                canvas.requestPointerLock();
            };
    }

    changeCallback = () => {
        const canvas = document.getElementById("renderCanvas");
        if (
            // @ts-ignore
            document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas
        )
            document.addEventListener("mousemove", this.mouseMove, false);
        else
            document.removeEventListener("mousemove", this.mouseMove, false);
    }

    mouseMove = (e: any) => {
        const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        this.mouseX += movementX * this.mouseSensitivity * this.deltaTime;
        this.mouseY += movementY * this.mouseSensitivity * this.deltaTime;
        this.mouseY = clamp(this.mouseY, this.mouseMin, this.mouseMax);
    };

    CreateGroundMaterial(): StandardMaterial {
        const groundMat = new StandardMaterial("groundMat", this.scene);
        const uvScale = 50;
        const texArray: Texture[] = [];

        const diffuseTex = new Texture(
            "./textures/stone/stone_diffuse.jpg",
            this.scene
        );
        groundMat.diffuseTexture = diffuseTex;
        texArray.push(diffuseTex);

        const normalTex = new Texture(
            "./textures/stone/stone_normal.jpg",
            this.scene
        );

        groundMat.bumpTexture = normalTex;
        groundMat.invertNormalMapX = true;
        groundMat.invertNormalMapY = true;
        texArray.push(normalTex);

        const aoTex = new Texture("./textures/stone/stone_ao.jpg", this.scene);
        groundMat.ambientTexture = aoTex;
        texArray.push(aoTex);

        const specTex = new Texture("./textures/stone/stone_spec.jpg", this.scene);
        groundMat.specularTexture = specTex;

        texArray.push(specTex);

        texArray.forEach((tex) => {
            tex.uScale = uvScale;
            tex.vScale = uvScale;
        });

        return groundMat;
    }
}


