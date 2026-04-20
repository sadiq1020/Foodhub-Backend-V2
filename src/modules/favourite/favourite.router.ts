import express from "express";
import auth from "../../middlewares/auth.middleware";
import { ROLES } from "../../shared";
import { favouriteController } from "./favourite.controller";

const router = express.Router();

// All routes are customer only
router.get("/", auth(ROLES.CUSTOMER), favouriteController.getMyFavourites);
router.post("/:mealId", auth(ROLES.CUSTOMER), favouriteController.addFavourite);
router.delete(
  "/:mealId",
  auth(ROLES.CUSTOMER),
  favouriteController.removeFavourite,
);
router.get(
  "/:mealId/check",
  auth(ROLES.CUSTOMER),
  favouriteController.isFavourited,
);

export const favouriteRouter = router;
