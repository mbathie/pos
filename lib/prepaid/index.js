import { PrepaidPass } from '@/models';
import crypto from 'crypto';

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
}

export async function addToPrepaid({ cart, employee, transaction }) {
  const prepaidProducts = (cart.products || []).filter(p => p.type === 'prepaid');
  if (prepaidProducts.length === 0) return [];

  const passes = [];
  for (const product of prepaidProducts) {
    // Generate unique code, retry if collision
    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const existing = await PrepaidPass.findOne({ code });
      if (!existing) break;
      attempts++;
    }

    // Total passes from pack-level field, multiplied by total quantity purchased
    const totalQty = product.prices?.reduce((sum, p) => sum + (p.qty || 0), 0) || 1;
    const totalPasses = (product.passes || product.totalPasses || 0) * totalQty;

    const pass = await PrepaidPass.create({
      pack: product.packId || product._id,
      customer: transaction.customer,
      transaction: transaction._id,
      org: employee.org._id,
      code,
      totalPasses,
      remainingPasses: totalPasses,
      products: (product.products || []).map(p => ({ _id: p._id, name: p.name })),
      status: 'active'
    });

    passes.push(pass);
    console.log(`Created prepaid pass ${code} with ${pass.totalPasses} passes for transaction ${transaction._id}`);
  }

  return passes;
}
