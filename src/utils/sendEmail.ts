// import nodemailer from "nodemailer"
// import { logger } from "./logger"

// interface EmailOptions {
//   email: string
//   subject: string
//   message: string
// }

// export const sendEmail = async (options: EmailOptions): Promise<void> => {
//   // Crear transporter
//   const transporter = nodemailer.createTransport({
//     host: env.emailHost,
//     port: env.emailPort,
//     auth: {
//       user: env.emailUser,
//       pass: env.emailPass,
//     },
//   })

//   // Definir opciones de email
//   const mailOptions = {
//     from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   }

//   try {
//     const info = await transporter.sendMail(mailOptions)
//     logger.info(`Email enviado: ${info.messageId}`)
//   } catch (error) {
//     if (error instanceof Error) {
//       logger.error(`Error al enviar email: ${error.message}`)
//     } else {
//       logger.error("Error desconocido al enviar email")
//     }
//     throw error
//   }
// }
