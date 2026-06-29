import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { jobsRouter } from "./jobs";
import { clipsRouter } from "./clips";
import { statsRouter } from "./stats";
import { uploadRouter } from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/jobs", jobsRouter);
router.use("/clips", clipsRouter);
router.use("/stats", statsRouter);
router.use("/upload", uploadRouter);

export default router;
