import { transporter } from "@/lib/mailer";

const FONT_MONOSPACE = "'Courier New', Courier, 'Lucida Console', Monaco, monospace !important";

const generateItemsHtml = (items: any[]) => {
  return items
    .map(
      (item: any, index: number) => `
      <tr style="border-bottom: 1px solid #eee; font-family: ${FONT_MONOSPACE};">
        <td style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">${index + 1}</td>
        <td style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">${item.name}</td>
        <td style="padding: 10px; text-align: center; font-family: ${FONT_MONOSPACE};">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">₹${item.price}</td>
        <td style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">₹${item.price * item.quantity}</td>
      </tr>
    `
    )
    .join("");
};

export const sendOrderConfirmation = async (order: any, user: any) => {
  try {
    const itemsHtml = generateItemsHtml(order.items);

    const mailOptions = {
      from: `"Morsel Orders" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Order Confirmation - #${order._id.toString().slice(-6).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { font-family: ${FONT_MONOSPACE}; }
            body, table, td, th, p, a, div, span, h1, h2, h3, h4, h5, h6, strong, b, em {
              font-family: ${FONT_MONOSPACE};
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: ${FONT_MONOSPACE};">
          <div style="font-family: ${FONT_MONOSPACE}; max-width: 600px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #0c4a6e; padding: 24px; text-align: center; color: white;">
              <h1 style="font-family: ${FONT_MONOSPACE}; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">Order Confirmed!</h1>
              <p style="font-family: ${FONT_MONOSPACE}; margin: 8px 0 0; font-size: 13px;">Thank you for your purchase.</p>
            </div>
            
            <div style="padding: 24px; font-family: ${FONT_MONOSPACE};">
              <p style="font-family: ${FONT_MONOSPACE}; margin: 0 0 10px;">Hi <strong style="font-family: ${FONT_MONOSPACE};">${user.name}</strong>,</p>
              <p style="font-family: ${FONT_MONOSPACE}; margin: 0 0 20px;">Your order has been placed successfully. Here are the details:</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 6px; margin: 20px 0; font-family: ${FONT_MONOSPACE};">
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Order ID:</strong> #${order._id.toString().slice(-6).toUpperCase()}</p>
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Transaction ID:</strong> ${order.paymentId}</p>
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Status:</strong> ${order.status}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: ${FONT_MONOSPACE};">
                <thead>
                  <tr style="background-color: #f1f5f9; font-family: ${FONT_MONOSPACE};">
                    <th style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">#</th>
                    <th style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">Item</th>
                    <th style="padding: 10px; text-align: center; font-family: ${FONT_MONOSPACE};">Qty</th>
                    <th style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">Price</th>
                    <th style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">Total</th>
                  </tr>
                </thead>
                <tbody style="font-family: ${FONT_MONOSPACE};">
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="font-family: ${FONT_MONOSPACE};">
                    <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold; font-family: ${FONT_MONOSPACE};">Grand Total:</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #0284c7; font-family: ${FONT_MONOSPACE};">₹${order.totalAmount}</td>
                  </tr>
                </tfoot>
              </table>

              <div style="margin-top: 24px; font-family: ${FONT_MONOSPACE};">
                <p style="font-weight: bold; margin-bottom: 8px; font-family: ${FONT_MONOSPACE};">Delivery Address:</p>
                <p style="margin: 0; color: #475569; font-family: ${FONT_MONOSPACE};">
                  ${order.shippingAddress.landmark}<br>
                  ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
                </p>
              </div>
            </div>

            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; font-family: ${FONT_MONOSPACE}; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-family: ${FONT_MONOSPACE};">&copy; ${new Date().getFullYear()} Morsel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending order email:", error);
  }
};

export const sendOrderStatusUpdateEmail = async (order: any, user: any, estimatedDate?: string) => {
  try {
    const itemsHtml = generateItemsHtml(order.items);
    const statusColor = order.status === 'Cancelled' ? '#ef4444' : '#0c4a6e'; // Red for cancel, Blue for others
    const statusTitle = order.status === 'Cancelled' ? 'Order Cancelled' : `Order ${order.status}`;

    const mailOptions = {
      from: `"Morsel Orders" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Order Update - #${order._id.toString().slice(-6).toUpperCase()} is ${order.status}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { font-family: ${FONT_MONOSPACE}; }
            body, table, td, th, p, a, div, span, h1, h2, h3, h4, h5, h6, strong, b, em {
              font-family: ${FONT_MONOSPACE};
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: ${FONT_MONOSPACE};">
          <div style="font-family: ${FONT_MONOSPACE}; max-width: 600px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: ${statusColor}; padding: 24px; text-align: center; color: white;">
              <h1 style="font-family: ${FONT_MONOSPACE}; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">${statusTitle}</h1>
              <p style="font-family: ${FONT_MONOSPACE}; margin: 8px 0 0; font-size: 13px;">Your order status has been updated.</p>
            </div>
            
            <div style="padding: 24px; font-family: ${FONT_MONOSPACE};">
              <p style="font-family: ${FONT_MONOSPACE}; margin: 0 0 10px;">Hi <strong style="font-family: ${FONT_MONOSPACE};">${user.name}</strong>,</p>
              <p style="font-family: ${FONT_MONOSPACE}; margin: 0 0 20px;">Your order #${order._id.toString().slice(-6).toUpperCase()} is now <strong style="font-family: ${FONT_MONOSPACE};">${order.status}</strong>.</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 6px; margin: 20px 0; font-family: ${FONT_MONOSPACE};">
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Order ID:</strong> #${order._id.toString().slice(-6).toUpperCase()}</p>
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Transaction ID:</strong> ${order.paymentId}</p>
                <p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Current Status:</strong> <span style="color: ${statusColor}; font-weight: bold; font-family: ${FONT_MONOSPACE};">${order.status}</span></p>
                ${estimatedDate ? `<p style="font-family: ${FONT_MONOSPACE}; margin: 5px 0;"><strong style="font-family: ${FONT_MONOSPACE};">Estimated Delivery:</strong> ${new Date(estimatedDate).toLocaleDateString()}</p>` : ''}
              </div>

              <p style="font-weight: bold; margin-bottom: 8px; font-family: ${FONT_MONOSPACE};">Order Details:</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: ${FONT_MONOSPACE};">
                <thead>
                  <tr style="background-color: #f1f5f9; font-family: ${FONT_MONOSPACE};">
                    <th style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">#</th>
                    <th style="padding: 10px; text-align: left; font-family: ${FONT_MONOSPACE};">Item</th>
                    <th style="padding: 10px; text-align: center; font-family: ${FONT_MONOSPACE};">Qty</th>
                    <th style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">Price</th>
                    <th style="padding: 10px; text-align: right; font-family: ${FONT_MONOSPACE};">Total</th>
                  </tr>
                </thead>
                <tbody style="font-family: ${FONT_MONOSPACE};">
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="font-family: ${FONT_MONOSPACE};">
                    <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold; font-family: ${FONT_MONOSPACE};">Grand Total:</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #0284c7; font-family: ${FONT_MONOSPACE};">₹${order.totalAmount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; font-family: ${FONT_MONOSPACE}; border-top: 1px solid #e2e8f0;">
               <p style="margin: 0; font-family: ${FONT_MONOSPACE};">&copy; ${new Date().getFullYear()} Morsel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending status email:", error);
  }
};
