import jwt from "jsonwebtoken"
import config from "../config/config"

export const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}
