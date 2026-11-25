import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listTrackedRepos,
  addTrackedRepo,
  togglePinRepo,
  removeTrackedRepo,
  getTrackedRepoPulls,
} from "../controllers/repos.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listTrackedRepos);
router.post("/", addTrackedRepo);
router.patch("/:id/pin", togglePinRepo);
router.delete("/:id", removeTrackedRepo);
router.get("/:id/pulls", getTrackedRepoPulls);

export const reposRoutes = router;
