import { v4 as uuidv4 } from "uuid";
import { stripe } from "../../config/stripe";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import { ICreateOrder } from "./order.interface";
import { generateOrderNumber } from "./order.utils";

const createOrder = async (data: ICreateOrder) => {
  // 1. Fetch meal prices from DB — never trust frontend prices
  const mealIds = data.items.map((item) => item.mealId);
  const meals = await prisma.meal.findMany({
    where: { id: { in: mealIds } },
    include: {
      provider: { select: { businessName: true } },
    },
  });

  if (meals.length !== mealIds.length) {
    throw new AppError(404, "One or more meals were not found");
  }

  // 2. Calculate totals server-side
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
  const transactionId = uuidv4(); // internal payment reference

  // 3. Create Order, OrderItems, and Payment in one transaction
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

  // 4. Create Stripe Checkout session
  // This happens OUTSIDE the transaction — if Stripe fails, the order still
  // exists in DB and the customer can retry payment later
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      // One line item per meal
      ...orderItemsData.map((item) => ({
        price_data: {
          currency: "bdt",
          product_data: {
            name: item.name,
          },
          // Stripe expects amount in cents (smallest currency unit)
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      // Delivery fee as a separate line item
      {
        price_data: {
          currency: "bdt",
          product_data: { name: "Delivery Fee" },
          unit_amount: deliveryFee * 100,
        },
        quantity: 1,
      },
    ],
    // These IDs are passed back in the webhook — critical for linking payment to order
    metadata: {
      orderId: order.id,
      paymentId: payment.id,
    },
    success_url: `${process.env.FRONTEND_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${process.env.FRONTEND_URL}/orders/${order.id}?payment=cancelled`,
  });

  return {
    order,
    payment,
    paymentUrl: stripeSession.url, // frontend redirects customer here
  };
};

// update order status (Provider only)
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
            include: {
              provider: { select: { id: true, userId: true } },
            },
          },
        },
      },
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

  return prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
    include: {
      items: { include: { meal: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });
};

// cancel order (Customer only)
const cancelOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
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

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
    include: {
      items: { include: { meal: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });
};

// get my orders (Customer only)
// const getMyOrders = async (userId: string) => {
//   return prisma.order.findMany({
//     where: { customerId: userId },
//     include: {
//       items: {
//         include: {
//           meal: {
//             select: { id: true, name: true, image: true, price: true },
//           },
//         },
//       },
//       payment: {
//         select: { id: true, status: true, amount: true },
//       },
//     },
//     orderBy: { createdAt: "desc" },
//   });
// };

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

// get all orders (Admin only)
// const getAllOrdersForAdmin = async () => {
//   return prisma.order.findMany({
//     include: {
//       items: {
//         include: {
//           meal: {
//             select: { id: true, name: true, image: true, price: true },
//           },
//         },
//       },
//       customer: {
//         select: { id: true, name: true, email: true, phone: true },
//       },
//       payment: {
//         select: { id: true, status: true, amount: true, transactionId: true },
//       },
//     },
//     orderBy: { createdAt: "desc" },
//   });
// };

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

// get order by id (Customer/Provider)
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
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
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
