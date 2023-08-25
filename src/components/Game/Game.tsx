import {useEffect, useRef, useState} from 'react'
import {BasicScene} from "../../babylon/scenes/basic-scene.ts";
import {useMetaMask} from "../../utils/walletConnection/useMetamask.ts";
import {Badge, Button, Card, Flex} from "@radix-ui/themes";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {lampCoordinates} from "../../babylon/lib/constants.ts";

const Game = ({setSelectedCoorinate, setIsShowModal, nfts, balance}: {
    setSelectedCoorinate: (_?: any) => void,
    setIsShowModal: (_?: any) => void,
    nfts: any,
    balance: string
}) => {
    const {status, connect, account, chainId} = useMetaMask();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isShowInfoModal, setIsShowInfoModal] = useState<boolean>(false)
    const [scene, setScene] = useState<BasicScene | null>(null)

    const createScene = async () => {
        if (canvasRef === null) return;
        const scene = new BasicScene(canvasRef.current!, {debug: true});
        await scene.initialize({
            setIsShowInfoModal: setIsShowInfoModal,
            setIsShowModal: setIsShowModal,
            setSelectedObjectName: setSelectedCoorinate
        });
        setScene(scene)
    }

    const setPlaneImages = async (nfts: any) => {
        await scene?.setImages(nfts)
    }

    const setPBalancePlane = async (balance: string) => {
        await scene?.createPlaneText(
            parseFloat(balance).toFixed(3).toString(),
            new Vector3(0, 1.7, 0,),
            Math.PI
        )
    }


    useEffect(() => {
        if (nfts && scene) {
            setPlaneImages(nfts)
        }
    }, [nfts, scene])

    useEffect(() => {
        if (scene && balance !== undefined) {
            setPBalancePlane(balance)
        }
    }, [scene, balance])

    useEffect(() => {
        createScene()
    }, [canvasRef]);

    return (
        <>
            {status === "unavailable" &&
                <Badge
                    variant="solid"
                    style={{zIndex: 1000, position: 'absolute', top: 10, right: 10}}
                    color="red"
                >
                    MetaMask not available
                </Badge>
            }

            {(status === "notConnected" || status === "connecting") &&
                <Button
                    style={{zIndex: 1000, position: 'absolute', top: 10, right: 10}}
                    onClick={connect}
                >
                    Connect
                </Button>
            }

            {status === "connected" &&
                <Badge
                    variant="solid"
                    style={{zIndex: 1000, position: 'absolute', top: 10, right: 10}}
                    color="green"
                >
                    Connected account {account} on chain ID {chainId}
                </Badge>
            }

            {isShowInfoModal &&
                <Card
                    style={{
                        position: 'absolute',
                        transform: 'translateX(50%)',
                        right: '50%',
                        top: 80
                    }}
                >
                    <Flex gap="3" align="center">
                        <Badge color="bronze">Press E</Badge>
                    </Flex>
                </Card>
            }
            <canvas id={'renderCanvas'} ref={canvasRef}/>
        </>
    )
};

export default Game
