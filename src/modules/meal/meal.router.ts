import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { mealController } from "./meal.controller";
import { createMealSchema, updateMealSchema } from "./meal.validation";

const router = express.Router();

router.get("/my-meals", auth(ROLES.PROVIDER), mealController.getMyMeals);
router.get("/", mealController.getAllMeals);

router.post(
  "/",
  auth(ROLES.PROVIDER),
  validateRequest(createMealSchema),
  mealController.createMeal,
);

router.get("/:id", mealController.getMealById);

router.put(
  "/:id",
  auth(ROLES.PROVIDER),
  validateRequest(updateMealSchema),
  mealController.updateMeal,
);

router.delete("/:id", auth(ROLES.PROVIDER), mealController.deleteMeal);

export const mealRouter = router;
