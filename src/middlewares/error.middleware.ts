import type { Request, Response, NextFunction } from "express"
import { ErrorResponse } from "../utils/errorResponse"
import { logger } from "../utils/logger"

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err }
  error.message = err.message

  // Log para desarrollo
  logger.error(err)

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Recurso no encontrado`
    error = new ErrorResponse(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Valor duplicado ingresado"
    error = new ErrorResponse(message, 400)
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ")
    error = new ErrorResponse(message, 400)
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Error del servidor",
  })
}
