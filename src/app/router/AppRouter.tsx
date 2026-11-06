import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default AppRouter;
