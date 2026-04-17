import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateCategory, IUpdateCategory } from "./category.interface";

// ✅ Helper to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// create new category
const createCategory = async (data: ICreateCategory) => {
  // console.log("🔍 Data received in service:", data);
  // console.log("🔍 Data type:", typeof data);
  // console.log("🔍 Data keys:", Object.keys(data));
  // ✅ Auto-generate slug from name
  const categoryData = {
    name: data.name,
    slug: generateSlug(data.name),
    image: data.image || null,
  };

  const result = await prisma.category.create({
    data: categoryData,
  });

  return result;
};

// get all categories
const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          meals: true, // this will show hoe many meals in each category
        },
      },
    },
    orderBy: {
      name: "asc", // sort by alphabetically
    },
  });

  return categories;
};

// update category
const updateCategory = async (categoryId: string, data: IUpdateCategory) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  // if (!category) {
  //   throw new Error("Category not found");
  // }

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  // ✅ Auto-generate slug if name is being updated
  const updateData: any = { ...data };
  if (data.name) {
    updateData.slug = generateSlug(data.name);
  }

  const updatedCategory = await prisma.category.update({
    where: { id: categoryId },
    data: updateData,
    include: {
      _count: {
        select: {
          meals: true,
        },
      },
    },
  });

  return updatedCategory;
};

// delete category
const deleteCategory = async (categoryId: string) => {
  // 1. Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          meals: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  // 2. Check if category has meals
  if (category._count.meals > 0) {
    throw new AppError(
      409,
      `Cannot delete category. It has ${category._count.meals} meal/s that is/are associate with it.`,
    );
  }

  // 3. Delete category
  await prisma.category.delete({
    where: { id: categoryId },
  });

  // 4. Return success message
  return { message: "Category deleted successfully!" };
};

export const categoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
