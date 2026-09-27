import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import RescueDispatch from "@/models/RescueDispatch";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dispatchId,
      action = "request",
      claimId,
      ngoName,
      contactPerson,
      contactPhone,
      pickupEta,
      beneficiaryCount,
      message,
    } = body;

    if (!dispatchId) {
      return NextResponse.json({ error: "dispatchId is required" }, { status: 400 });
    }

    await connectToDatabase();
    const dispatch = await RescueDispatch.findById(dispatchId);

    if (!dispatch) {
      return NextResponse.json({ error: "Food listing not found" }, { status: 404 });
    }

    // 1. Submit a new Claim / Pickup Request
    if (action === "request") {
      if (!ngoName || !contactPhone || !pickupEta) {
        return NextResponse.json(
          { error: "Organization name, contact phone, and estimated pickup time are required" },
          { status: 400 }
        );
      }

      if (dispatch.status !== "available" && dispatch.status !== "claim_pending") {
        return NextResponse.json(
          { error: `This food listing is already ${dispatch.status}` },
          { status: 400 }
        );
      }

      const newClaim = {
        claimId: randomUUID(),
        ngoName,
        contactPerson: contactPerson || ngoName,
        contactPhone,
        pickupEta,
        beneficiaryCount: Number(beneficiaryCount) || 0,
        message: message || "",
        status: "pending",
        createdAt: new Date(),
      };

      dispatch.claims = dispatch.claims || [];
      dispatch.claims.push(newClaim as any);
      dispatch.status = "claim_pending";

      await dispatch.save();

      return NextResponse.json({
        success: true,
        dispatch,
        claim: newClaim,
        message: "Your pickup claim request has been sent to the food donor for approval!",
      });
    }

    // 2. Creator Approves a Claim Request
    if (action === "approve") {
      if (!claimId) {
        return NextResponse.json({ error: "claimId is required to approve" }, { status: 400 });
      }

      const targetClaim = dispatch.claims.find((c: any) => c.claimId === claimId);
      if (!targetClaim) {
        return NextResponse.json({ error: "Claim request not found" }, { status: 404 });
      }

      // Mark chosen claim as approved, others as rejected
      dispatch.claims.forEach((c: any) => {
        if (c.claimId === claimId) {
          c.status = "approved";
        } else if (c.status === "pending") {
          c.status = "rejected";
        }
      });

      dispatch.status = "claimed";
      dispatch.approvedClaimId = claimId;
      dispatch.claimedByNgoName = targetClaim.ngoName;
      dispatch.claimedAt = new Date();

      await dispatch.save();

      return NextResponse.json({
        success: true,
        dispatch,
        message: `Claim approved for ${targetClaim.ngoName}! Pick-up is confirmed.`,
      });
    }

    // 3. Creator Rejects a Claim Request
    if (action === "reject") {
      if (!claimId) {
        return NextResponse.json({ error: "claimId is required to reject" }, { status: 400 });
      }

      const targetClaim = dispatch.claims.find((c: any) => c.claimId === claimId);
      if (!targetClaim) {
        return NextResponse.json({ error: "Claim request not found" }, { status: 404 });
      }

      targetClaim.status = "rejected";

      // If no other claims are pending, revert status to available
      const remainingPending = dispatch.claims.some((c: any) => c.status === "pending");
      if (!remainingPending && dispatch.status === "claim_pending") {
        dispatch.status = "available";
      }

      await dispatch.save();

      return NextResponse.json({
        success: true,
        dispatch,
        message: "Claim request declined.",
      });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to process claim request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process claim request" },
      { status: 500 }
    );
  }
}
