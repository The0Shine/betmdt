// import { v2 as cloudinary } from "cloudinary"
// import { logger } from "./logger"

// // Configurar cloudinary
// cloudinary.config({
//   cloud_name: config.cloudinaryCloudName,
//   api_key: config.cloudinaryApiKey,
//   api_secret: config.cloudinaryApiSecret,
// })

// export const uploadImage = async (file: string, folder = "techzone"): Promise<string> => {
//   try {
//     const result = await cloudinary.uploader.upload(file, {
//       folder,
//     })
//     return result.secure_url
//   } catch (error) {
//     if (error instanceof Error) {
//       logger.error(`Error al subir imagen a Cloudinary: ${error.message}`)
//     } else {
//       logger.error("Error desconocido al subir imagen a Cloudinary")
//     }
//     throw error
//   }
// }

// export const deleteImage = async (publicId: string): Promise<void> => {
//   try {
//     await cloudinary.uploader.destroy(publicId)
//   } catch (error) {
//     if (error instanceof Error) {
//       logger.error(`Error al eliminar imagen de Cloudinary: ${error.message}`)
//     } else {
//       logger.error("Error desconocido al eliminar imagen de Cloudinary")
//     }
//     throw error
//   }
// }
