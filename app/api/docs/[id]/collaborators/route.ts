import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canView, type DocumentWithAccess } from "@/lib/doc-permissions";
import { ObjectId } from "mongodb";

export async function GET(
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

    const db = await getDb();
    const doc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess | null;

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canView(doc, user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get collaborator emails
    const collaboratorIds = doc.collaborators?.map((c) => c.userId) || [];
    
    if (collaboratorIds.length === 0) {
      return NextResponse.json({ collaborators: [] });
    }

    const collaborators = await db
      .collection("users")
      .find({ _id: { $in: collaboratorIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const collaboratorsWithEmail = doc.collaborators?.map((c) => {
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
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const collaboratorUserId = searchParams.get("userId");

    if (!collaboratorUserId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const doc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess | null;

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only owner can remove collaborators
    if (doc.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can remove collaborators" },
        { status: 403 }
      );
    }

    // Remove collaborator
    await db.collection("documents").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: {
          collaborators: { userId: collaboratorUserId },
        },
      } as Record<string, unknown>
    );

    // Fetch updated document and return updated collaborators list
    const updatedDoc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess;

    const collaboratorIds = updatedDoc.collaborators?.map((c) => c.userId) || [];
    
    if (collaboratorIds.length === 0) {
      return NextResponse.json({ collaborators: [] });
    }

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
    console.error("Error removing collaborator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
