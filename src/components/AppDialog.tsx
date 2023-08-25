import {Button, Dialog, Flex} from "@radix-ui/themes";
import {useRef, useState} from "react";
import {useStorageUpload} from "@thirdweb-dev/react";
import {Divider, FileInput, Image, Select, Stack, TextInput} from "@mantine/core";
import {ethers} from "ethers";
import {CONTRACT_ABI, CONTRACT_ABI_2, CONTRACT_ADDRES, CONTRACT_ADDRESS_2, RPC_URL} from "../utils/contants.tsx";

const AppDialog = ({
                       title,
                       isOpen,
                       setIsOpen,
                       data,
                       scene,
                       contractRead,
                       nfts
                   }: {
    title: string,
    isOpen: boolean,
    setIsOpen: (_?: any) => void,
    data: any
}) => {
    const [file, setFile] = useState<any>(null)
    const {mutateAsync: upload} = useStorageUpload();
    const [nftName, setNftName] = useState('');
    const resetRef = useRef<any>(null);
    const [selectedMyNft, setSelectedMyNft] = useState<string | null>(null);

    const clearFile = () => {
        setFile(null);
        resetRef.current?.();
    };

    const SubmitUploadedFile = async () => {
        try {
            let uploadUrl = [' ']
            if (file) {
                uploadUrl = await upload({
                    data: [file],
                    options: {uploadWithGatewayUrl: false, uploadWithoutDirectory: true},
                });

                const ipfsRes = await upload({
                    data: [{uri: uploadUrl[0], name: nftName}],
                    options: {uploadWithGatewayUrl: false, uploadWithoutDirectory: true},
                });

                try {
                    const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
                    const contractRead = new ethers.Contract(CONTRACT_ADDRES, CONTRACT_ABI, customHttpProvider);
                    const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = metamaskProvider.getSigner();
                    const contractWrite = contractRead.connect(signer)
                    const tx = await contractWrite.mint(ipfsRes[0])
                    await tx.wait();
                    console.log(tx?.hash)
                } catch (e) {
                    console.log(e)
                }
                clearFile()
            }
        } catch (e) {
            console.log(e)
            clearFile()
        }
    }

    const SetNft = async () => {
        try {
            try {
                const customHttpProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
                const contractRead = new ethers.Contract(CONTRACT_ADDRESS_2, CONTRACT_ABI_2, customHttpProvider);
                const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = metamaskProvider.getSigner();
                const contractWrite = contractRead.connect(signer)
                const tx = await contractWrite.setNft(0, selectedMyNft + 1)
                await tx.wait();
                console.log(tx?.hash)
            } catch (e) {
                console.log(e)
            }
        } catch (e) {
            console.log(e)
            clearFile()
        }
    }

    return (
        <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
            <Dialog.Content style={{maxWidth: 450}}>
                {/*<Dialog.Title>{data?.name}</Dialog.Title>*/}
                <Dialog.Description size="2" mb="4">
                    <Stack w={'100%'}>
                        <Select
                            value={selectedMyNft}
                            onChange={setSelectedMyNft}
                            placeholder="NFTs"
                            data={nfts?.map((item: any, index: any) => ({value: index, label: item?.name}))}
                        />
                        <Button onClick={SetNft}>
                            Set new nft
                        </Button>
                        <Divider my={'md'}/>
                    </Stack>

                    <Stack align={'center'} justify={'center'} w={'100%'}>
                        <FileInput w={'100%'} ref={resetRef} placeholder="File" value={file} onChange={setFile}/>
                        {data?.name === 'Chain' &&
                            <>
                                <TextInput
                                    w={'100%'}
                                    placeholder="Name"
                                    withAsterisk
                                    value={nftName}
                                    onChange={(e) => setNftName(e.currentTarget.value)}
                                />
                            </>
                        }
                        {file && <Image src={URL.createObjectURL(file)}/>}
                    </Stack>
                </Dialog.Description>
                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </Dialog.Close>
                    <Dialog.Close>
                        <Button onClick={SubmitUploadedFile}>Save</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}

export default AppDialog;