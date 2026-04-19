import { v4 as uuidv4 } from "uuid";
import { getStripe } from "../../config/stripe";
import AppError from "../../errors/AppError";
import {
  sendOrderCancelledEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
} from "../../lib/email";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import { ICreateOrder } from "./order.interface";
import { generateOrderNumber } from "./order.utils";

const createOrder = async (data: ICreateOrder) => {
  const mealIds = data.items.map((item) => item.mealId);
  const meals = await prisma.meal.findMany({
    where: { id: { in: mealIds } },
    include: { provider: { select: { businessName: true } } },
  });

  if (meals.length !== mealIds.length) {
    throw new AppError(404, "One or more meals were not found");
  }

  let subtotal = 0;
  const orderItemsData = data.items.map((item) => {
    const meal = meals.find((m) => m.id === item.mealId);
    if (!meal) throw new AppError(404, `Meal ${item.mealId} not found`);
    if (!meal.isAvailable) {
      throw new AppError(400, `"${meal.name}" is currently unavailable`);
    }
    const itemTotal = Number(meal.price) * item.quantity;
    subtotal += itemTotal;
    return {
      mealId: item.mealId,
      quantity: item.quantity,
      price: meal.price,
      name: meal.name,
    };
  });

  const deliveryFee = 50;
  const total = subtotal + deliveryFee;
  const orderNumber = generateOrderNumber();
  const transactionId = uuidv4();

  const { order, payment } = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        deliveryAddress: data.deliveryAddress,
        phone: data.phone,
        notes: data.notes ?? null,
        subtotal,
        deliveryFee,
        total,
        status: "PLACED",
        paymentStatus: "UNPAID",
      },
    });

    await tx.orderItem.createMany({
      data: orderItemsData.map((item) => ({
        orderId: newOrder.id,
        mealId: item.mealId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    const newPayment = await tx.payment.create({
      data: {
        orderId: newOrder.id,
        amount: total,
        transactionId,
        status: "UNPAID",
      },
    });

    return { order: newOrder, payment: newPayment };
  });

  const stripeSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      ...orderItemsData.map((item) => ({
        price_data: {
          currency: "bdt",
          product_data: { name: item.name },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      {
        price_data: {
          currency: "bdt",
          product_data: { name: "Delivery Fee" },
          unit_amount: deliveryFee * 100,
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: order.id, paymentId: payment.id },
    success_url: `${process.env.FRONTEND_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.FRONTEND_URL}/orders/${order.id}?payment=cancelled`,
  });

  // Send order confirmation email — non-blocking
  // If email fails, the order still succeeds
  const customer = await prisma.user.findUnique({
    where: { id: data.customerId },
    select: { name: true, email: true },
  });

  if (customer && stripeSession.url) {
    sendOrderConfirmationEmail({
      to: customer.email,
      customerName: customer.name,
      orderNumber,
      orderId: order.id,
      items: orderItemsData.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: data.deliveryAddress,
      paymentUrl: stripeSession.url,
    }).catch((err) =>
      console.error("Failed to send order confirmation email:", err.message),
    );
  }

  return { order, payment, paymentUrl: stripeSession.url };
};

const updateOrderStatus = async (
  orderId: string,
  status: string,
  userId: string,
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          meal: {
            include: { provider: { select: { id: true, userId: true } } },
          },
        },
      },
      customer: { select: { name: true, email: true } },
    },
  });

  if (!order) throw new AppError(404, "Order not found");

  const hasProviderMeals = order.items.some(
    (item) => item.meal.provider.userId === userId,
  );
  if (!hasProviderMeals) {
    throw new AppError(
      403,
      "You can only update orders that contain your meals",
    );
  }

  const allowedStatuses = ["PREPARING", "READY", "DELIVERED"];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      400,
      "Status must be one of: PREPARING, READY, DELIVERED",
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
    include: {
      items: { include: { meal: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  // Send status update email — non-blocking
  if (order.customer) {
    sendOrderStatusUpdateEmail({
      to: order.customer.email,
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      status: status as "PREPARING" | "READY" | "DELIVERED",
    }).catch((err) =>
      console.error("Failed to send status update email:", err.message),
    );
  }

  return updatedOrder;
};

const cancelOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
    },
  });

  if (!order) throw new AppError(404, "Order not found");
  if (order.customerId !== userId) {
    throw new AppError(403, "You can only cancel your own orders");
  }
  if (order.status !== "PLACED") {
    throw new AppError(400, "Only PLACED orders can be cancelled");
  }
  if (order.paymentStatus === "PAID") {
    throw new AppError(
      400,
      "Paid orders cannot be cancelled. Please contact support.",
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
    include: {
      items: { include: { meal: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  // Send cancellation email — non-blocking
  if (order.customer) {
    sendOrderCancelledEmail({
      to: order.customer.email,
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
    }).catch((err) =>
      console.error("Failed to send cancellation email:", err.message),
    );
  }

  return updatedOrder;
};

// Paginated with QueryBuilder
const getMyOrders = async (userId: string, queryParams: IQueryParams) => {
  return new QueryBuilder(prisma.order, queryParams, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultLimit: 10,
  })
    .paginate()
    .sort()
    .where({ customerId: userId })
    .execute({
      items: {
        include: {
          meal: { select: { id: true, name: true, image: true, price: true } },
        },
      },
      payment: { select: { id: true, status: true, amount: true } },
    });
};

// Paginated with QueryBuilder
const getAllOrdersForAdmin = async (queryParams: IQueryParams) => {
  return new QueryBuilder(prisma.order, queryParams, {
    searchableFields: ["orderNumber"],
    filterableFields: ["status", "paymentStatus"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultLimit: 10,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .execute({
      items: {
        include: {
          meal: { select: { id: true, name: true, image: true, price: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      payment: {
        select: { id: true, status: true, amount: true, transactionId: true },
      },
    });
};

const getOrderById = async (
  orderId: string,
  userId: string,
  userRole: string,
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          meal: {
            include: {
              provider: {
                select: { id: true, businessName: true, userId: true },
              },
            },
          },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      payment: {
        select: { id: true, status: true, amount: true, transactionId: true },
      },
    },
  });

  if (!order) throw new AppError(404, "Order not found");

  if (userRole === "CUSTOMER" && order.customerId !== userId) {
    throw new AppError(403, "You can only view your own orders");
  }

  if (userRole === "PROVIDER") {
    const hasProviderMeals = order.items.some(
      (item) => item.meal.provider.userId === userId,
    );
    if (!hasProviderMeals) {
      throw new AppError(
        403,
        "You can only view orders that contain your meals",
      );
    }
  }

  return order;
};

export const orderService = {
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getMyOrders,
  getAllOrdersForAdmin,
  getOrderById,
};
