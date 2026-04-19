import express from "express";
import { uploadMealImage } from "../../config/cloudinary";
import auth from "../../middlewares/auth.middleware";
import { ROLES } from "../../shared";
import { mealController } from "./meal.controller";

const router = express.Router();

router.get("/my-meals", auth(ROLES.PROVIDER), mealController.getMyMeals);
router.get("/", mealController.getAllMeals);

router.post(
  "/",
  auth(ROLES.PROVIDER),
  uploadMealImage.single("image"), // ← multer runs first, uploads to Cloudinary
  // validateRequest(createMealSchema),
  mealController.createMeal,
);

router.get("/:id", mealController.getMealById);

router.put(
  "/:id",
  auth(ROLES.PROVIDER),
  uploadMealImage.single("image"), // ← optional on update
  // validateRequest(updateMealSchema),
  mealController.updateMeal,
);

router.delete("/:id", auth(ROLES.PROVIDER), mealController.deleteMeal);

export const mealRouter = router;
