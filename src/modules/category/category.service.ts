import { deleteFromCloudinary } from "../../config/cloudinary";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateCategory, IUpdateCategory } from "./category.interface";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const createCategory = async (data: ICreateCategory) => {
  const categoryData = {
    name: data.name,
    slug: generateSlug(data.name),
    image: data.image || null,
  };

  return prisma.category.create({ data: categoryData });
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    include: { _count: { select: { meals: true } } },
    orderBy: { name: "asc" },
  });
};

const updateCategory = async (categoryId: string, data: IUpdateCategory) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, image: true },
  });

  if (!category) throw new AppError(404, "Category not found");

  // Delete old image if a new one was uploaded
  if (data.image && category.image && category.image !== data.image) {
    deleteFromCloudinary(category.image).catch(() => {});
  }

  const updateData: any = { ...data };
  if (data.name) {
    updateData.slug = generateSlug(data.name);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: updateData,
    include: { _count: { select: { meals: true } } },
  });
};

const deleteCategory = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { meals: true } } },
  });

  if (!category) throw new AppError(404, "Category not found");

  if (category._count.meals > 0) {
    throw new AppError(
      400,
      `Cannot delete category. It has ${category._count.meals} meal(s) associated with it.`,
    );
  }

  // Delete category image from Cloudinary if it exists
  if ((category as any).image) {
    deleteFromCloudinary((category as any).image).catch(() => {});
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { message: "Category deleted successfully!" };
};

export const categoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
