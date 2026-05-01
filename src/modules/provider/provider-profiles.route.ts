import express from "express";
import { providerController } from "./provider.controller";

const router = express.Router();
// Public: top providers for landing page (must be before /:id to avoid conflict)
router.get("/top", providerController.getTopProviders);

router.get("/:id", providerController.getProviderById); // Public
router.get("/", providerController.getAllProviders); // Public

export const providerProfilesRouter = router;
