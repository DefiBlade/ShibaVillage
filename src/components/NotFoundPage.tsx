import {Link} from "react-router-dom";
import {Container, Flex, Text} from "@radix-ui/themes";

export const NotFoundPage = () => {
    return (
        <Container>
            <div>404</div>
            <Text>You have found a secret place.</Text>
            <Text align="center">
                Unfortunately, this is only a 404 page. You may have mistyped the address, or the page has
                been moved to another URL.
            </Text>
            <Flex>
                <Link to={'/'}>
                    Take me back to home page
                </Link>
            </Flex>
        </Container>
    );
};