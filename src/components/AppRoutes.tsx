import {Route, Routes} from "react-router-dom";
import GameContainer from "./Game/GameContainer.tsx";
import HomeContainer from "./Game/HomeContainer.tsx";
import {NotFoundPage} from "./NotFoundPage.tsx";

const routes = [
    {element: <GameContainer/>, path: '/'},
    {element: <HomeContainer/>, path: '/home'},
    {element: <NotFoundPage/>, path: '/*'},
]

const AppRoutes = () => {
    return (
        <>
            <Routes>
                {routes?.map(r =>
                    <Route key={r.path} path={r.path} element={r.element}/>
                )}
            </Routes>
        </>
    );
}

export default AppRoutes;