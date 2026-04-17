import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateOrder } from "./order.interface";
import { generateOrderNumber } from "./order.utils";

// create order
const createOrder = async (data: ICreateOrder) => {
  // 1. Fetch meal prices from database (don't trust frontend prices!)
  const mealIds = data.items.map((item) => item.mealId);
  const meals = await prisma.meal.findMany({
    where: { id: { in: mealIds } },
  });

  // 2. Calculate subtotal (price * quantity for each item)
  let subtotal = 0;
  const orderItemsData = data.items.map((item) => {
    const meal = meals.find((m) => m.id === item.mealId);
    if (!meal) throw new AppError(404, `Meal ${item.mealId} not found`);

    const itemTotal = (meal.price as any) * item.quantity;
    subtotal += itemTotal;

    return {
      mealId: item.mealId,
      quantity: item.quantity,
      price: meal.price, // Save price at time of order
    };
  });

  // 3. Add delivery fee
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  // 4. Generate unique order number
  const orderNumber = generateOrderNumber(); // from order.utils.ts

  // 5. Create Order AND OrderItems in a TRANSACTION
  // This ensures both are created together or neither is created
  const order = await prisma.$transaction(async (tx) => {
    // Create the Order
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
      },
    });

    // Create all OrderItems
    await tx.orderItem.createMany({
      data: orderItemsData.map((item) => ({
        orderId: newOrder.id,
        mealId: item.mealId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    // Return the order with items included
    return tx.order.findUnique({
      where: { id: newOrder.id },
      include: {
        items: {
          include: {
            meal: true,
          },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });

  return order;
};

// update order status (Provider only)
const updateOrderStatus = async (
  orderId: string,
  status: string,
  userId: string,
) => {
  // 1. Find the order with its items and meal providers
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          meal: {
            include: {
              provider: {
                select: { id: true, userId: true },
              },
            },
          },
        },
      },
    },
  });

  // 2. Verify order exists
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  // 3. Verify the order contains items from this provider's meals
  const hasProviderMeals = order.items.some(
    (item) => item.meal.provider.userId === userId,
  );

  if (!hasProviderMeals) {
    throw new AppError(
      403,
      "You can only update orders that contain your meals",
    );
  }

  // 4. Validate status (only allow provider-specific statuses)
  const allowedStatuses = ["PREPARING", "READY", "DELIVERED"];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      400,
      "Invalid status. Allowed: PREPARING, READY, DELIVERED",
    );
  }

  // 5. Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
    include: {
      items: {
        include: {
          meal: true,
        },
      },
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // 6. Return updated order
  return updatedOrder;
};

// cancel order (Customer only)
const cancelOrder = async (orderId: string, userId: string) => {
  // 1. Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: { id: true },
      },
    },
  });

  // 2. Verify order exists
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  // 3. Only customer who placed the order can cancel
  if (order.customerId !== userId) {
    throw new AppError(403, "You can only cancel your own orders");
  }

  // 4. Only if status is PLACED
  if (order.status !== "PLACED") {
    throw new AppError(403, "Only orders with PLACED status can be cancelled");
  }

  // 5. Update status to CANCELLED
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
    include: {
      items: {
        include: {
          meal: true,
        },
      },
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // 6. Return updated order
  return updatedOrder;
};

// get my orders (Customer only)
const getMyOrders = async (userId: string) => {
  // Fetch all orders for this customer
  const orders = await prisma.order.findMany({
    where: {
      customerId: userId,
    },
    include: {
      items: {
        include: {
          meal: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Most recent orders first
    },
  });

  return orders;
};

// get all orders (Admin only)
const getAllOrdersForAdmin = async () => {
  // Fetch all orders from all customers
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          meal: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc", // recent orders will show first
    },
  });

  return orders;
};

// get order by id (Customer/Provider)
const getOrderById = async (
  orderId: string,
  userId: string,
  userRole: string,
) => {
  // Fetch the order with all details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          meal: {
            include: {
              provider: {
                select: {
                  id: true,
                  businessName: true,
                  userId: true,
                },
              },
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Verify order exists
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  // Authorization check
  if (userRole === "CUSTOMER") {
    // Customer can only view their own orders
    if (order.customerId !== userId) {
      throw new AppError(403, "You can only view your own orders");
    }
  } else if (userRole === "PROVIDER") {
    // Provider can only view orders containing their meals
    const hasProviderMeals = order.items.some(
      (item) => item.meal.provider.userId === userId,
    );

    if (!hasProviderMeals) {
      throw new AppError(
        403,
        "You can only view orders that contain your meals",
      );
    }
    // no
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
