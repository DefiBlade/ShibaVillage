import {useEffect, useState} from "react";
import {Contract, ethers} from "ethers";
import {useMetaMask} from "../../utils/walletConnection/useMetamask.ts";
import AppDialog from "../AppDialog.tsx";
import MenuDialog from "../MenuDialog.tsx";
import {useHotkeys} from "../../hooks/useHotkeys.tsx";
import Home from "./Home.tsx";
import {HomeScene} from "../../babylon/scenes/home-scene.ts";
import {picturesCoordonates} from "../../babylon/lib/constants.ts";
import {CONTRACT_ABI, CONTRACT_ADDRES, IPFS_URL, RPC_URL} from "../../utils/contants.tsx";

const HomeContainer = () => {
    const {account} = useMetaMask();

    const [escapeKey, setEscapeKey] = useState<boolean>(false)
    const [nfts, setNfts] = useState<any[]>([])
    const [contractRead, setContractRead] = useState<Contract | null>(null)
    const [isSuccessLoading, setIsSuccessLoading] = useState(false)
    const [walletBalance, setWalletBalance] = useState<string>('0')
    const [isShowModal, setIsShowModal] = useState<boolean>(false)
    const [selectedCoordinate, setSelectedCoordinate] = useState<any>('')
    const [scene, setScene] = useState<HomeScene | null>(null)

    const getNfts = async ({from, to, initialData, contract}: {
        from: number,
        to: number,
        initialData: any[],
        contract: any
    }) => {
        const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = metamaskProvider.getSigner();

        try {
            const batchPromises = [];
            for (let i = from; i < to; i++) {
                batchPromises.push(contract.tokenOfOwnerByIndex(signer.getAddress(), i));
            }

            const batchInfos = await Promise.all(batchPromises);

            const data = []

            for (let i = 0; i < batchInfos?.length; i++) {
                const x = await contract.tokenURI(batchInfos[i])
                const res = await fetch(IPFS_URL + x?.slice(7))
                const d = await res.json()
                data?.push(d)
            }

            console.log(batchInfos)
            // const arr = batchInfos.map(batchInfo => ({
            //     id: parseInt(batchInfo),
            //     image: './shiba.png'
            // }));

            setNfts([...initialData, ...data?.map((item, index) => ({
                ...item,
                image: item?.uri?.slice(7)
            }))]);
            setIsSuccessLoading(true)
        } catch (e) {
            console.log(e);
        }
    };

    console.log(nfts)

    const getEthBalance = async () => {
        const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const b = await customHttpProvider?.getBalance(account!)
        setWalletBalance((parseFloat(b?.toString()) / 10 ** 18).toString())
    }

    useHotkeys([['Escape', () => setEscapeKey((prev: any) => !prev)]]);

    useEffect(() => {
        const getData = async () => {
            const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
            const cRead = new ethers.Contract(CONTRACT_ADDRES, CONTRACT_ABI, customHttpProvider);
            const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = metamaskProvider.getSigner();
            const address = await signer.getAddress()
            const batchesCount = await cRead.balanceOf(address)
            await getNfts({from: 0, to: parseInt(batchesCount), initialData: [], contract: cRead})
            setContractRead(cRead)
        }

        if (account && !isSuccessLoading) {
            getData()
            getEthBalance()
        }
    }, [account, isSuccessLoading])

    console.log(selectedCoordinate)

    const setPlaneImagesaaaaaaa = async (index) => {
        await scene?.createPictureImage(
            picturesCoordonates[index].x,
            picturesCoordonates[index].y,
            picturesCoordonates[index].z,
            picturesCoordonates[index].xr,
            picturesCoordonates[index].yr,
            picturesCoordonates[index].zr,
            './back.jpg',
            scene!,
            index
        )
    }


    useEffect(() => {
        if (isShowModal && scene && selectedCoordinate) {
            // setPlaneImagesaaaaaaa(selectedCoordinate?.id)
        }
    }, [isShowModal, scene, selectedCoordinate])

    return (
        <>
            {scene &&
                <AppDialog
                    contractRead={contractRead}
                    setIsOpen={setIsShowModal}
                    title={walletBalance}
                    isOpen={isShowModal}
                    data={selectedCoordinate}
                    scene={scene}
                    nfts={nfts}
                />
            }
            <MenuDialog
                setIsOpen={setEscapeKey}
                title={'Menu'}
                isOpen={escapeKey}
                description={selectedCoordinate?.name}

            />
            <Home
                balance={walletBalance}
                nfts={nfts}
                setSelectedCoorinate={setSelectedCoordinate}
                setIsShowModal={setIsShowModal}
                scene={scene}
                setScene={setScene}
                isOpenModal={isShowModal}
            />
        </>

    );
}

export default HomeContainer;