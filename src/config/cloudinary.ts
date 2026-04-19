import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export { cloudinary };

// Meal images storage — goes into foodhub/meals folder on Cloudinary
const mealStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "foodhub/meals",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  } as any,
});

// Category images storage — goes into foodhub/categories folder
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "foodhub/categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [{ width: 400, height: 400, crop: "limit" }],
  } as any,
});

// These are the middleware functions you attach to routes
export const uploadMealImage = multer({
  storage: mealStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

export const uploadCategoryImage = multer({
  storage: categoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// Helper to delete a file from Cloudinary by its URL
// Used when update replaces an old image or when a request fails
export const deleteFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from the Cloudinary URL
    // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/<public_id>.<ext>
    const urlParts = imageUrl.split("/");
    const filenameWithExt = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const parentFolder = urlParts[urlParts.length - 3];
    if (!filenameWithExt) return;
    const publicId = `${parentFolder}/${folder}/${filenameWithExt.split(".")[0]}`;

    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    // Log but don't throw — deletion failure shouldn't break the app
    console.error("Failed to delete from Cloudinary:", err);
  }
};
