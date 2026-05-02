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

  const [pendingProviders, approvedProviders, rejectedProviders] =
    await Promise.all([
      prisma.providerProfiles.count({ where: { status: "PENDING" } }),
      prisma.providerProfiles.count({ where: { status: "APPROVED" } }),
      prisma.providerProfiles.count({ where: { status: "REJECTED" } }),
    ]);

  // ── Chart data 1: orders by status (for pie/donut chart) ──────────────────
  const [placed, preparing, ready, delivered, cancelled] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.order.count({ where: { status: "PREPARING" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
  ]);

  const ordersByStatus = [
    { name: "Placed", value: placed, fill: "#6366f1" },
    { name: "Preparing", value: preparing, fill: "#f59e0b" },
    { name: "Ready", value: ready, fill: "#3b82f6" },
    { name: "Delivered", value: delivered, fill: "#10b981" },
    { name: "Cancelled", value: cancelled, fill: "#ef4444" },
  ];

  // ── Chart data 2: orders per day for last 7 days (for bar chart) ──────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentOrders = await prisma.order.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  });

  // Build a map of day label → count
  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dayMap[label] = 0;
  }

  recentOrders.forEach((o) => {
    const label = new Date(o.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (label in dayMap) dayMap[label] = (dayMap[label] ?? 0) + 1;
  });

  const ordersLast7Days = Object.entries(dayMap).map(([day, orders]) => ({
    day,
    orders,
  }));

  // ── Chart data 3: user breakdown (for bar chart) ──────────────────────────
  const userBreakdown = [
    { name: "Customers", value: totalCustomers, fill: "#6366f1" },
    { name: "Providers", value: totalProviders, fill: "#10b981" },
  ];

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
    // Chart data
    ordersByStatus,
    ordersLast7Days,
    userBreakdown,
  };
};

const getProvidersByStatus = async (status?: string) => {
  const where = status ? { status: status as any } : {};

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

const approveProvider = async (providerId: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: providerId },
    select: { id: true, status: true, businessName: true },
  });

  if (!provider) throw new AppError(404, "Provider not found");
  if (provider.status === "APPROVED")
    throw new AppError(409, "Provider is already approved");

  return prisma.providerProfiles.update({
    where: { id: providerId },
    data: { status: "APPROVED", rejectionReason: null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const rejectProvider = async (providerId: string, reason: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: providerId },
    select: { id: true, status: true, businessName: true },
  });

  if (!provider) throw new AppError(404, "Provider not found");
  if (provider.status === "REJECTED")
    throw new AppError(409, "Provider is already rejected");

  return prisma.providerProfiles.update({
    where: { id: providerId },
    data: { status: "REJECTED", rejectionReason: reason },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const adminService = {
  getStats,
  getProvidersByStatus,
  approveProvider,
  rejectProvider,
};
