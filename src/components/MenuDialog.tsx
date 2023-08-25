import {Button, Dialog, Flex, Switch, Text} from "@radix-ui/themes";
import {useEffect, useState} from "react";

const MenuDialog = ({
                        title,
                        isOpen,
                        setIsOpen,
                        description
                    }: {
    title: string,
    isOpen: boolean,
    setIsOpen: (_?: any) => void,
    description: string
}) => {
    const [isFirstPersonMode, setIsFirstPersonMode] = useState(false)

    useEffect(() => {
        setIsFirstPersonMode(localStorage.getItem('first-person') === 'true')
    }, [])

    const toggleFirtPersonView = () => {
        if (isFirstPersonMode) {
            localStorage.setItem('first-person', 'false')
            setIsFirstPersonMode(false)
            setTimeout(() => {
                window.location.reload()
            }, 100)
        } else {
            localStorage.setItem('first-person', 'true')
            setIsFirstPersonMode(true)
            setTimeout(() => {
                window.location.reload()
            }, 100)
        }
    }

    return (
        <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
            <Dialog.Content style={{maxWidth: 450}}>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {description}
                </Dialog.Description>
                <Flex gap="3" mt="4" justify="between" direction={'column'}>
                    <Flex justify={'start'}>
                        <Text size="2">
                            <label>
                                <Switch
                                    onClick={toggleFirtPersonView}
                                    mr="2" checked={isFirstPersonMode}
                                />
                                First Person{' '}
                                <Text color="gray">Mode</Text>
                            </label>
                        </Text>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button>Save</Button>
                        </Dialog.Close>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}

export default MenuDialog;