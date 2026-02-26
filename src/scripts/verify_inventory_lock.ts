import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product.model";
import Order from "../models/order.model";
import { OrderService } from "../services/order.service";
import { ORDER_STATUS } from "../constants";

dotenv.config({ path: ".env.dev" });

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB for testing...");

    // 1. Cleanup & Setup
    await Product.deleteMany({ name: /^LOCK_TEST_PRODUCT/ });
    await Order.deleteMany({ "shippingAddress.fullName": "LOCK_TEST_USER" });

    const product = await Product.create({
      name: "LOCK_TEST_PRODUCT",
      price: 100,
      quantity: 5, // Only 5 in stock
      category: new mongoose.Types.ObjectId().toString(),
      image: "test.jpg",
      description: "Testing inventory lock",
      status: "in-stock",
      barcode: "123456",
      unit: "cái",
      tags: ["test"]
    });

    console.log(`Created product with stock: ${product.quantity}`);

    const orderData = {
      user: new mongoose.Types.ObjectId().toString(),
      orderItems: [{
        product: product._id as any, // Cast to any to bypass strict checks if needed, but it should be Types.ObjectId
        name: product.name,
        quantity: 3, // Wants 3
        image: product.image,
        price: product.price
      }],
      shippingAddress: {
        fullName: "LOCK_TEST_USER",
        phone: "0123456789",
        provinceName: "Hanoi",
        districtName: "Hanoi",
        wardName: "Hanoi",
        streetAddress: "123 Test St",
        fullAddress: "123 Test St, Hanoi"
      },
      paymentMethod: "COD",
      totalPrice: 300
    };

    // 2. Simulate Concurrency
    console.log("Launching 2 concurrent orders for 3 units each (Total 6, Stock 5)...");
    
    // We use Promise.all to fire them almost simultaneously
    const results = await Promise.allSettled([
      OrderService.createOrder(orderData),
      OrderService.createOrder(orderData)
    ]);

    results.forEach((res, index) => {
      if (res.status === "fulfilled") {
        console.log(`Order ${index + 1}: SUCCESS - ID: ${res.value._id}`);
      } else {
        console.log(`Order ${index + 1}: FAILED - Reason: ${res.reason.message}`);
      }
    });

    // 3. Verify Final Stock
    const updatedProduct = await Product.findById(product._id);
    console.log(`Final stock: ${updatedProduct?.quantity} (Expected: 2)`);

    // 4. Test Rollback (Optional but good)
    // Create an order with 2 items, where the 2nd one fails
    console.log("\nTesting Rollback (Order with 1st item OK, 2nd item Fail)...");
    const product2 = await Product.create({
        name: "LOCK_TEST_PRODUCT_2",
        price: 50,
        quantity: 10,
        category: new mongoose.Types.ObjectId().toString(),
        image: "test2.jpg",
        description: "Testing rollback",
        status: "in-stock",
        barcode: "654321",
        unit: "cái",
        tags: ["test"]
    });

    const failingOrderData = {
        ...orderData,
        orderItems: [
            { ...orderData.orderItems[0], quantity: 1 }, // This should normally deduct 1
            { product: new mongoose.Types.ObjectId().toString(), name: "NON_EXISTENT", quantity: 1, image: "", price: 0 } // This will fail
        ]
    };

    try {
        await OrderService.createOrder(failingOrderData);
    } catch (e: any) {
        console.log(`Caught expected failure: ${e.message}`);
    }

    const checkProduct1 = await Product.findById(product._id);
    console.log(`Stock of Product 1 after rollback: ${checkProduct1?.quantity} (Expected: 2)`);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
