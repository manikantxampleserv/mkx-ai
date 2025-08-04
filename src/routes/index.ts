import { Router } from "express";
import tasks from "../v1/routes/tasks";
import employee from "../v1/routes/employee";

const routes = Router();

routes.use("/v1", tasks);
routes.use("/v1", employee);

export default routes;
