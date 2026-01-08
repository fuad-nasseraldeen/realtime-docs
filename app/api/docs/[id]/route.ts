import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  canView,
  canEdit,
  canDelete,
  getUserAccessRole,
  type DocumentWithAccess,
} from "@/lib/doc-permissions";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateDocSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

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

    const accessRole = getUserAccessRole(doc, user.id);

    return NextResponse.json({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content || "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      accessRole,
    });
  } catch (error) {
    console.error("Error fetching doc:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validated = updateDocSchema.parse(body);

    const db = await getDb();
    const doc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess | null;

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canEdit(doc, user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: {
      updatedAt: Date;
      title?: string;
      content?: string;
    } = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) {
      updateData.title = validated.title;
    }

    if (validated.content !== undefined) {
      updateData.content = validated.content;
    }

    await db.collection("documents").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedDoc = await db.collection("documents").findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      id: updatedDoc!._id.toString(),
      title: updatedDoc!.title,
      content: updatedDoc!.content || "",
      createdAt: updatedDoc!.createdAt,
      updatedAt: updatedDoc!.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Error updating doc:", error);
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

    const db = await getDb();
    const doc = (await db.collection("documents").findOne({
      _id: new ObjectId(id),
    })) as DocumentWithAccess | null;

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canDelete(doc, user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.collection("documents").deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting doc:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
