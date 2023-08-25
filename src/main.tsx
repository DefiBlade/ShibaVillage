import ReactDOM from 'react-dom/client'
import '@radix-ui/themes/styles.css';
import './index.css'
import {Theme} from "@radix-ui/themes";
import {MetaMaskProvider} from "./utils/walletConnection/metamaskProvider.tsx";
import AppRoutes from "./components/AppRoutes.tsx";
import {BrowserRouter} from "react-router-dom";
import {ErrorBoundary} from "react-error-boundary";
import ErrorPage from "./components/ErrorPage.tsx";
import {ThirdwebProvider} from "@thirdweb-dev/react";
import React from "react";
import {MantineProvider} from "@mantine/core";

ReactDOM.createRoot(document.getElementById('root')!).render(
    <Theme appearance="dark">
        <MetaMaskProvider>
            <BrowserRouter>
                <ErrorBoundary FallbackComponent={ErrorPage}>
                    <ThirdwebProvider
                        clientId={'bd1a20327ee1d8481de0adcdb0b45efb'}
                    >
                        <MantineProvider
                            withGlobalStyles
                            withCSSVariables
                            withNormalizeCSS
                            theme={{colorScheme: 'dark'}}
                        >
                            <AppRoutes/>
                        </MantineProvider>
                    </ThirdwebProvider>
                </ErrorBoundary>
            </BrowserRouter>
        </MetaMaskProvider>
    </Theme>
)
