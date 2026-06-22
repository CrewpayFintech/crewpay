import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flutterwaveRouter from "./flutterwave";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flutterwaveRouter);

export default router;
