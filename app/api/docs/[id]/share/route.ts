import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canShare, type DocumentWithAccess } from "@/lib/doc-permissions";
import { ObjectId } from "mongodb";
import { z } from "zod";

const shareSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["viewer", "editor"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = shareSchema.parse(body);

    const db = await getDb();
    const doc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess | null;

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canShare(doc, user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user by email
    const targetUser = await db.collection("users").findOne({
      email: validated.email,
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      );
    }

    const targetUserId = targetUser._id.toString();

    // Prevent sharing with owner
    if (doc.ownerId === targetUserId) {
      return NextResponse.json(
        { error: "Document owner cannot be added as collaborator" },
        { status: 400 }
      );
    }

    // Check if already a collaborator
    const existingIndex = doc.collaborators?.findIndex(
      (c) => c.userId === targetUserId
    );

    const collaboratorEntry = {
      userId: targetUserId,
      role: validated.role,
      addedAt: new Date(),
    };

    if (existingIndex !== undefined && existingIndex >= 0) {
      // Update existing collaborator role
      await db.collection("documents").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            [`collaborators.${existingIndex}.role`]: validated.role,
          },
        }
      );
    } else {
      // Add new collaborator
      await db.collection("documents").updateOne(
        { _id: new ObjectId(id) },
        {
          $push: {
            collaborators: collaboratorEntry,
          },
        } as Record<string, unknown>
      );
    }

    // Fetch updated document
    const updatedDoc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess;

    // Get collaborator emails
    const collaboratorIds = updatedDoc.collaborators?.map((c) => c.userId) || [];
    const collaborators = await db
      .collection("users")
      .find({ _id: { $in: collaboratorIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const collaboratorsWithEmail = updatedDoc.collaborators?.map((c) => {
      const user = collaborators.find(
        (u) => u._id.toString() === c.userId
      );
      return {
        userId: c.userId,
        email: user?.email || "Unknown",
        role: c.role,
        addedAt: c.addedAt,
      };
    });

    return NextResponse.json({
      collaborators: collaboratorsWithEmail || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Error sharing document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
