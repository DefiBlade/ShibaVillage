import {FC} from 'react';

type ErrorPageProps = { error: any, resetErrorBoundary: any }

const ErrorPage: FC<ErrorPageProps> = ({error, resetErrorBoundary}) => {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Try again</button>
        </div>
    );
}

export default ErrorPage;
