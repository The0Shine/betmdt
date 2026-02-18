import { IOrder } from "../order.interface";
import { IResponse, IListResponse } from "./response.interface";

export interface IOrderResponse extends IOrder {
  // Add specific populated fields if needed, but Order model usually has complex nesting
  // Controller getOrderById jsonOne(res, StatusCodes.OK, order)
  // getOrders jsonAll(res, StatusCodes.OK, orders)
}

export type IOrderSingleResponse = IResponse<IOrderResponse>;
export type IOrderListResponse = IListResponse<IOrderResponse>;

export interface IRefundResponse {
  success: boolean;
  message: string;
  order: IOrderResponse;
}
