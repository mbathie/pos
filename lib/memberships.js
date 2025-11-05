import { Membership } from '@/models'
import { connectDB } from '@/lib/mongoose'

export async function getMemberships({ customerId }) {
  await connectDB()
  
  // Find all memberships for this customer
  const memberships = await Membership.find({ customer: customerId })
    .populate('customer', 'name email phone memberId')
    .populate('product', 'name desc type prices')
    // .populate('transaction')
    .populate('org', 'name')
    .populate('location', 'name')
    .populate('suspensions.createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean()
  
  return memberships
}

export async function createMembership({
  customerId,
  orgId,
  locationId,
  membershipData
}) {
  await connectDB()
  
  // Create the membership with required fields
  const membership = await Membership.create({
    ...membershipData,
    customer: customerId,
    org: orgId,
    location: locationId || membershipData.location
  })
  
  // Populate references for response
  const populatedMembership = await Membership.findById(membership._id)
    .populate('customer', 'name email phone memberId')
    .populate('product', 'name desc type prices')
    // .populate('transaction', '_id')
    .populate('org', 'name')
    .populate('location', 'name')
    .lean()
  
  return populatedMembership
}

export async function updateMembership(membershipId, updateData, orgId) {
  await connectDB()
  
  // Find and update membership, ensuring it belongs to the right org
  const query = { _id: membershipId }
  if (orgId) {
    query.org = orgId
  }
  
  const membership = await Membership.findOneAndUpdate(
    query,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('customer', 'name email phone memberId')
    .populate('product', 'name desc type prices')
    .populate('transaction', '_id')
    .populate('org', 'name')
    .populate('location', 'name')
    .lean()
  
  if (!membership) {
    throw new Error('Membership not found')
  }
  
  return membership
}

export async function deleteMembership(membershipId, orgId) {
  await connectDB()
  
  // Find and delete membership, ensuring it belongs to the right org
  const query = { _id: membershipId }
  if (orgId) {
    query.org = orgId
  }
  
  const membership = await Membership.findOneAndDelete(query)
  
  if (!membership) {
    throw new Error('Membership not found')
  }
  
  return { success: true, deleted: membership._id }
}