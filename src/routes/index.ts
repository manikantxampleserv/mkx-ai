import { Router } from "express";
import employee from "../v1/routes/employee";
import user from "../v1/routes/user";
import auth from "../v1/routes/auth";

const routes = Router();

routes.use("/v1", employee);
routes.use("/v1", user);
routes.use("/v1", auth);

export default routes;
