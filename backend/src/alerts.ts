import sgMail from '@sendgrid/mail';

const API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'alerts@pricewatch.dev';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
}

interface Product {
  id: string;
  name: string;
  url: string;
}

function isConfigured(): boolean {
  if (!API_KEY) {
    console.warn('[Alerts] SENDGRID_API_KEY not set — skipping email alert.');
    return false;
  }
  return true;
}

export async function sendPriceDropAlert(
  product: Product,
  oldPrice: number,
  newPrice: number,
  toEmail: string
): Promise<void> {
  if (!isConfigured()) return;

  const drop = oldPrice - newPrice;
  const dropPct = ((drop / oldPrice) * 100).toFixed(1);

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `📉 Price Drop Alert — ${product.name}`,
    text: `Good news! The price of "${product.name}" has dropped.\n\nOld price: ₹${oldPrice}\nNew price: ₹${newPrice}\nSaving: ₹${drop.toFixed(0)} (${dropPct}% off)\n\nView product: ${product.url}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #111;">
        <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 8px;">📉 Price Drop Alert</h1>
        <p style="color: #767676; margin: 0 0 24px; font-size: 0.9rem;">INE Store PriceWatch</p>
        <p style="font-size: 1.1rem; font-weight: 600; margin: 0 0 20px;">${product.name}</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e4e4e4; color: #767676; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;">Old Price</td>
            <td style="padding: 10px; border: 1px solid #e4e4e4; font-weight: 700; text-decoration: line-through; color: #767676;">₹${oldPrice}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e4e4e4; color: #767676; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;">New Price</td>
            <td style="padding: 10px; border: 1px solid #e4e4e4; font-weight: 700; font-size: 1.4rem;">₹${newPrice}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e4e4e4; color: #767676; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;">You Save</td>
            <td style="padding: 10px; border: 1px solid #e4e4e4; font-weight: 700; color: #111;">₹${drop.toFixed(0)} (${dropPct}% off)</td>
          </tr>
        </table>
        <a href="${product.url}" style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700;">View Product →</a>
        <p style="margin-top: 24px; color: #767676; font-size: 0.75rem;">You are receiving this because you set up a price alert for this product in INE Store PriceWatch.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`[Alerts] ✅ Price drop email sent to ${toEmail} for "${product.name}"`);
  } catch (err: any) {
    console.error(`[Alerts] ❌ Failed to send price drop email:`, err?.response?.body || err.message);
  }
}

export async function sendBackInStockAlert(
  product: Product,
  stock: number,
  toEmail: string
): Promise<void> {
  if (!isConfigured()) return;

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `✅ Back In Stock — ${product.name}`,
    text: `Great news! "${product.name}" is back in stock (${stock} units available).\n\nView product: ${product.url}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #111;">
        <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 8px;">✅ Back In Stock</h1>
        <p style="color: #767676; margin: 0 0 24px; font-size: 0.9rem;">INE Store PriceWatch</p>
        <p style="font-size: 1.1rem; font-weight: 600; margin: 0 0 8px;">${product.name}</p>
        <p style="margin: 0 0 24px; font-size: 0.95rem;">${stock} unit${stock > 1 ? 's' : ''} now available. Don't miss out!</p>
        <a href="${product.url}" style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700;">View Product →</a>
        <p style="margin-top: 24px; color: #767676; font-size: 0.75rem;">You are receiving this because you set up a stock alert for this product in INE Store PriceWatch.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`[Alerts] ✅ Back-in-stock email sent to ${toEmail} for "${product.name}"`);
  } catch (err: any) {
    console.error(`[Alerts] ❌ Failed to send stock alert email:`, err?.response?.body || err.message);
  }
}
