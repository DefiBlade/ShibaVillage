import {useEffect, useState} from "react";
import {Contract, ethers} from "ethers";
import {useMetaMask} from "../../utils/walletConnection/useMetamask.ts";
import AppDialog from "../AppDialog.tsx";
import MenuDialog from "../MenuDialog.tsx";
import {useHotkeys} from "../../hooks/useHotkeys.tsx";
import Game from "./Game.tsx";
import {CONTRACT_ABI, CONTRACT_ADDRES, RPC_URL} from "../../utils/contants.tsx";

const GameContainer = () => {
    const {account} = useMetaMask();

    const [escapeKey, setEscapeKey] = useState<boolean>(false)
    const [nfts, setNfts] = useState<any[]>([])
    const [contractRead, setContractRead] = useState<Contract | null>(null)
    const [isSuccessLoading, setIsSuccessLoading] = useState(false)
    const [walletBalance, setWalletBalance] = useState<string>('0')
    const [isShowModal, setIsShowModal] = useState<boolean>(false)
    const [selectedCoordinate, setSelectedCoordinate] = useState<any>('')

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

            const arr = batchInfos.map(batchInfo => ({
                id: parseInt(batchInfo),
                image: './shiba.png'
            }));

            setNfts([...initialData, ...arr]);
            setIsSuccessLoading(true)
        } catch (e) {
            console.log(e);
        }
    };

    const getEthBalance = async () => {
        const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const b = await customHttpProvider?.getBalance(account!)
        setWalletBalance((parseFloat(b?.toString()) / 10 ** 18).toString())
    }

    console.log(selectedCoordinate)

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

    return (
        <>
            <AppDialog
                setIsOpen={setIsShowModal}
                title={walletBalance}
                isOpen={isShowModal}
                data={selectedCoordinate}
            />
            <MenuDialog
                setIsOpen={setEscapeKey}
                title={'Menu'}
                isOpen={escapeKey}
                description={selectedCoordinate?.name}

            />
            <Game
                balance={walletBalance}
                nfts={nfts}
                setSelectedCoorinate={setSelectedCoordinate}
                setIsShowModal={setIsShowModal}
            />
        </>

    );
}

export default GameContainer;