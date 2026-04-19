import express from "express";
import { uploadCategoryImage } from "../../config/cloudinary";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { categoryController } from "./category.controller";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const router = express.Router();

router.get("/", categoryController.getAllCategories);

router.post(
  "/",
  auth(ROLES.ADMIN),
  uploadCategoryImage.single("image"), // ← multer runs first
  validateRequest(createCategorySchema),
  categoryController.createCategory,
);

router.put(
  "/:id",
  auth(ROLES.ADMIN),
  uploadCategoryImage.single("image"), // ← optional on update
  validateRequest(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete("/:id", auth(ROLES.ADMIN), categoryController.deleteCategory);

export const categoryRouter = router;
