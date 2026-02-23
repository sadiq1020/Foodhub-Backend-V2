// import { Request, Response } from "express";
// import { categoryService } from "./category.service";

// // create new category
// const createCategory = async (req: Request, res: Response) => {
//   try {
//     const result = await categoryService.createCategory(req.body);
//     res.status(201).json(result);
//   } catch (err) {
//     res.status(400).json({
//       error: "Category Creating Failed",
//       details: err,
//     });
//   }
// };

// // get all categories (Public)
// const getAllCategories = async (req: Request, res: Response) => {
//   try {
//     const result = await categoryService.getAllCategories();

//     res.status(200).json({
//       success: true,
//       message: "Categories retrieved successfully",
//       data: result,
//     });
//   } catch (err: any) {
//     res.status(500).json({
//       success: false,
//       message: err.message || "Failed to retrieve categories",
//     });
//   }
// };

// // update category (Admin only)
// const updateCategory = async (req: Request, res: Response) => {
//   try {
//     const categoryId = req.params.id as string;

//     if (!categoryId) {
//       return res.status(400).json({
//         success: false,
//         message: "Category ID is required",
//       });
//     }

//     const result = await categoryService.updateCategory(categoryId, req.body);

//     res.status(200).json({
//       success: true,
//       message: "Category updated successfully",
//       data: result,
//     });
//   } catch (err: any) {
//     const statusCode = err.message === "Category not found" ? 404 : 400;

//     res.status(statusCode).json({
//       success: false,
//       message: err.message || "Failed to update category",
//     });
//   }
// };

// // delete category (Admin only)
// const deleteCategory = async (req: Request, res: Response) => {
//   try {
//     const categoryId = req.params.id as string;

//     if (!categoryId) {
//       return res.status(400).json({
//         success: false,
//         message: "Category ID is required",
//       });
//     }

//     const result = await categoryService.deleteCategory(categoryId);

//     res.status(200).json({
//       success: true,
//       message: result.message,
//     });
//   } catch (err: any) {
//     const statusCode = err.message === "Category not found" ? 404 : 400;

//     res.status(statusCode).json({
//       success: false,
//       message: err.message || "Failed to delete category",
//     });
//   }
// };

// export const categoryController = {
//   createCategory,
//   getAllCategories,
//   updateCategory,
//   deleteCategory,
// };

import { Request, Response } from "express";
import { categoryService } from "./category.service";

// create new category
const createCategory = async (req: Request, res: Response) => {
  try {
    const result = await categoryService.createCategory(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    console.error("❌ Create category error:", err); // ✅ Debug log
    res.status(400).json({
      success: false,
      message: err.message || "Category Creating Failed", // ✅ Send actual error message
      error: "Category Creating Failed",
      details: process.env.NODE_ENV === "development" ? err : undefined,
    });
  }
};

// get all categories (Public)
const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await categoryService.getAllCategories();

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("❌ Get categories error:", err); // ✅ Debug log
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve categories",
    });
  }
};

// update category (Admin only)
const updateCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.id as string;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const result = await categoryService.updateCategory(categoryId, req.body);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("❌ Update category error:", err); // ✅ Debug log
    const statusCode = err.message === "Category not found" ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to update category",
    });
  }
};

// delete category (Admin only)
const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.id as string;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const result = await categoryService.deleteCategory(categoryId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    console.error("❌ Delete category error:", err); // ✅ Debug log
    const statusCode = err.message === "Category not found" ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to delete category",
    });
  }
};

export const categoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
