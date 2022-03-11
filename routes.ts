import { Router } from "express";
import { MapController } from "./controllers";

const routes = Router();

routes.get("/generateMap", [], MapController.generate);

export default routes;
