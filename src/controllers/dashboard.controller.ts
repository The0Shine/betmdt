import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../models/order.model";
import Product from "../models/product.model";
import User from "../models/user.model";
import { Stock } from "../models/stock.model";
import { jsonOne } from "../utils/general";

interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface PopulatedOrder {
  _id: string;
  user: PopulatedUser;
  totalPrice: number;
  status: string;
  createdAt: Date;
}

// @desc    Lấy thống kê tổng quan dashboard
// @route   GET /api/dashboard/overview
// @access  Private/Admin
export const getDashboardOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    // Thống kê cơ bản
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      todayOrders,
      monthlyRevenue,
      lastMonthRevenue,
      lowStockProducts,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      // Tổng số người dùng
      User.countDocuments(),

      // Tổng số sản phẩm
      Product.countDocuments(),

      // Tổng số đơn hàng
      Order.countDocuments(),

      // Tổng doanh thu
      Order.aggregate([
        { $match: { status: "completed", isPaid: true } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),

      // Đơn hàng hôm nay
      Order.countDocuments({
        createdAt: { $gte: today },
      }),

      // Doanh thu tháng này
      Order.aggregate([
        {
          $match: {
            status: "completed",
            isPaid: true,
            createdAt: { $gte: thisMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),

      // Doanh thu tháng trước
      Order.aggregate([
        {
          $match: {
            status: "completed",
            isPaid: true,
            createdAt: { $gte: lastMonth, $lt: thisMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),

      // Sản phẩm sắp hết hàng
      Product.find({ quantity: { $lte: 10 } })
        .select("name quantity")
        .limit(10),

      // Đơn hàng gần đây
      Order.find()
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(5),

      // Sản phẩm bán chạy
      Order.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.product",
            totalSold: { $sum: "$orderItems.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$orderItems.quantity", "$orderItems.price"],
              },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
      ]),
    ]);

    // Tính toán tỷ lệ tăng trưởng
    const currentMonthRevenue = monthlyRevenue[0]?.total || 0;
    const previousMonthRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth =
      previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) /
            previousMonthRevenue) *
          100
        : 0;

    // Thống kê trạng thái đơn hàng
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const overview = {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayOrders,
        monthlyRevenue: currentMonthRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      charts: {
        orderStatus: orderStatusStats,
        topProducts: topProducts.map((item) => ({
          name: item.product.name,
          sold: item.totalSold,
          revenue: item.revenue,
        })),
      },
      alerts: {
        lowStockProducts: lowStockProducts.map((product) => ({
          id: product._id,
          name: product.name,
          quantity: product.quantity,
        })),
      },
      recent: {
        orders: recentOrders.map((order: any) => ({
          id: order._id,
          customer: `${order.user?.firstName || ""} ${
            order.user?.lastName || ""
          }`.trim(),
          total: order.totalPrice,
          status: order.status,
          createdAt: order.createdAt,
        })),
      },
    };

    jsonOne(res, StatusCodes.OK, overview);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thống kê doanh thu theo thời gian
// @route   GET /api/dashboard/revenue-chart
// @access  Private/Admin
export const getRevenueChart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = "7days" } = req.query;
    let startDate: Date;
    let groupBy: any;

    const now = new Date();

    switch (period) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
      case "12months":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
    }

    const revenueData = await Order.aggregate([
      {
        $match: {
          status: "completed",
          isPaid: true,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format dữ liệu cho chart
    const chartData = revenueData.map((item) => {
      let date: string;
      if (period === "12months") {
        date = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      } else {
        date = `${item._id.year}-${String(item._id.month).padStart(
          2,
          "0"
        )}-${String(item._id.day).padStart(2, "0")}`;
      }

      return {
        date,
        revenue: item.revenue,
        orders: item.orders,
      };
    });

    jsonOne(res, StatusCodes.OK, { chartData, period });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thống kê sản phẩm
// @route   GET /api/dashboard/product-stats
// @access  Private/Admin
export const getProductStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      categoryStats,
      stockStats,
      topSellingProducts,
      recentlyAddedProducts,
    ] = await Promise.all([
      // Thống kê theo danh mục
      Product.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Thống kê tồn kho
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
            lowStock: {
              $sum: { $cond: [{ $lte: ["$quantity", 10] }, 1, 0] },
            },
            outOfStock: {
              $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
            },
          },
        },
      ]),

      // Sản phẩm bán chạy nhất
      Order.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.product",
            totalSold: { $sum: "$orderItems.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$orderItems.quantity", "$orderItems.price"],
              },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
      ]),

      // Sản phẩm mới thêm
      Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name price quantity createdAt"),
    ]);

    const productStats = {
      overview: stockStats[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0,
        lowStock: 0,
        outOfStock: 0,
      },
      categories: categoryStats,
      topSelling: topSellingProducts.map((item) => ({
        id: item.product._id,
        name: item.product.name,
        sold: item.totalSold,
        revenue: item.revenue,
        image: item.product.image,
      })),
      recentlyAdded: recentlyAddedProducts,
    };

    jsonOne(res, StatusCodes.OK, productStats);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thống kê kho hàng
// @route   GET /api/dashboard/inventory-stats
// @access  Private/Admin
export const getInventoryStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stockMovements, pendingVouchers, monthlyMovements, criticalStock] =
      await Promise.all([
        // Biến động kho gần đây
        Stock.find()
          .populate("createdBy", "firstName lastName")
          .populate("items.product", "name")
          .sort({ createdAt: -1 })
          .limit(10),

        // Phiếu kho chờ duyệt
        Stock.countDocuments({ status: "pending" }),

        // Biến động kho trong tháng
        Stock.aggregate([
          {
            $match: {
              createdAt: { $gte: thisMonth },
              status: "approved",
            },
          },
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              totalValue: { $sum: "$totalValue" },
            },
          },
        ]),

        // Sản phẩm cần nhập thêm
        Product.find({ quantity: { $lte: 5 } })
          .select("name quantity")
          .sort({ quantity: 1 })
          .limit(10),
      ]);

    const inventoryStats = {
      summary: {
        pendingVouchers,
        monthlyImports:
          monthlyMovements.find((m) => m._id === "import")?.count || 0,
        monthlyExports:
          monthlyMovements.find((m) => m._id === "export")?.count || 0,
        criticalStockCount: criticalStock.length,
      },
      recentMovements: stockMovements.map((voucher) => ({
        id: voucher._id,
        type: voucher.type,
        voucherNumber: voucher.voucherNumber,
        status: voucher.status,
        totalValue: voucher.totalValue,
        createdBy:
          typeof voucher.createdBy === "object" &&
          voucher.createdBy !== null &&
          "firstName" in voucher.createdBy &&
          "lastName" in voucher.createdBy
            ? `${(voucher.createdBy as any).firstName} ${
                (voucher.createdBy as any).lastName
              }`
            : "",
        createdAt: voucher.createdAt,
      })),
      criticalStock: criticalStock.map((product) => ({
        id: product._id,
        name: product.name,
        quantity: product.quantity,
      })),
      monthlyStats: monthlyMovements,
    };

    jsonOne(res, StatusCodes.OK, inventoryStats);
  } catch (error) {
    next(error);
  }
};
