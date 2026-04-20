import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";

const getStats = async () => {
  const [totalUsers, totalCustomers, totalProviders] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
  ]);

  const totalOrders = await prisma.order.count();
  const totalCategories = await prisma.category.count();

  // Also count providers by status for the dashboard
  const [pendingProviders, approvedProviders, rejectedProviders] =
    await Promise.all([
      prisma.providerProfiles.count({ where: { status: "PENDING" } }),
      prisma.providerProfiles.count({ where: { status: "APPROVED" } }),
      prisma.providerProfiles.count({ where: { status: "REJECTED" } }),
    ]);

  return {
    totalUsers,
    totalCustomers,
    totalProviders,
    totalOrders,
    totalCategories,
    providers: {
      pending: pendingProviders,
      approved: approvedProviders,
      rejected: rejectedProviders,
    },
  };
};

// Get all providers filtered by status — for admin review
const getProvidersByStatus = async (status?: string) => {
  const where = status ? { status: status as any } : {}; // no filter = return all

  return prisma.providerProfiles.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      _count: { select: { meals: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// Approve a provider
const approveProvider = async (providerId: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: providerId },
    select: { id: true, status: true, businessName: true },
  });

  if (!provider) throw new AppError(404, "Provider not found");

  if (provider.status === "APPROVED") {
    throw new AppError(409, "Provider is already approved");
  }

  return prisma.providerProfiles.update({
    where: { id: providerId },
    data: {
      status: "APPROVED",
      rejectionReason: null, // clear any previous rejection reason
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

// Reject a provider with a reason
const rejectProvider = async (providerId: string, reason: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: providerId },
    select: { id: true, status: true, businessName: true },
  });

  if (!provider) throw new AppError(404, "Provider not found");

  if (provider.status === "REJECTED") {
    throw new AppError(409, "Provider is already rejected");
  }

  return prisma.providerProfiles.update({
    where: { id: providerId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const adminService = {
  getStats,
  getProvidersByStatus,
  approveProvider,
  rejectProvider,
};
