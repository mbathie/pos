import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule } from "@/models"

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const orgId = employee.org._id;
  const { id } = await params;

  const schedule = await Schedule.findOne({ _id: id, org: orgId })
    .populate("product")
    .populate({
      path: "locations.classes.customers.customer",
      select: "name email phone memberId dependents photo"
    })

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const scheduleObj = schedule.toObject();
  const loc = scheduleObj.locations?.find(loc =>
    loc.location?.toString() === employee.selectedLocationId?.toString()
  );
  
  // Get all classes for this location, sorted by datetime
  let allClasses = (loc?.classes || []).sort((a, b) => 
    new Date(a.datetime) - new Date(b.datetime)
  );
  
  // Process classes to extract dependent details (including photo)
  allClasses = allClasses.map(cls => ({
    ...cls,
    customers: cls.customers?.map(cust => {
      // If there's a dependent ID, find the dependent in the customer's dependents array
      if (cust.dependent && cust.customer?.dependents) {
        const dependentDetails = cust.customer.dependents.find(
          dep => dep._id?.toString() === cust.dependent.toString()
        );
        return {
          ...cust,
          // Ensure dependent has photo field if it exists
          dependent: dependentDetails || { _id: cust.dependent }
        };
      }
      return cust;
    }) || []
  }));
  
  const filteredSchedule = {
    ...scheduleObj,
    classes: allClasses,
    locations: undefined
  };

  return NextResponse.json(filteredSchedule);
}
