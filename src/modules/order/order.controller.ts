import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { orderService } from "./order.service";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.createOrder({
    customerId: req.user!.id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully. Complete payment to confirm.",
    data: {
      order: order.order,
      payment: order.payment,
      paymentUrl: order.paymentUrl, // frontend uses this to redirect to Stripe
    },
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  const { status } = req.body;
  if (!orderId) throw new AppError(400, "Order ID is required");
  if (!status) throw new AppError(400, "Status is required");

  const order = await orderService.updateOrderStatus(
    orderId,
    status,
    req.user!.id,
  );
  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  if (!orderId) throw new AppError(400, "Order ID is required");

  const order = await orderService.cancelOrder(orderId, req.user!.id);
  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: order,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const orders = await orderService.getMyOrders(req.user!.id);
  res.status(200).json({
    success: true,
    message: "Orders retrieved successfully",
    data: orders,
  });
});

const getAllOrdersForAdmin = catchAsync(async (req: Request, res: Response) => {
  const orders = await orderService.getAllOrdersForAdmin();
  res.status(200).json({
    success: true,
    message: "All orders retrieved successfully",
    data: orders,
    total: orders.length,
  });
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  if (!orderId) throw new AppError(400, "Order ID is required");

  const order = await orderService.getOrderById(
    orderId,
    req.user!.id,
    req.user!.role,
  );
  res.status(200).json({
    success: true,
    message: "Order retrieved successfully",
    data: order,
  });
});

export const orderController = {
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getMyOrders,
  getAllOrdersForAdmin,
  getOrderById,
};
