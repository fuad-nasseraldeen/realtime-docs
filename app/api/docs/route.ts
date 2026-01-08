import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getUserAccessRole, type DocumentWithAccess } from "@/lib/doc-permissions";
import { z } from "zod";

const createDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    
    // Ensure user.id is a string
    const userId = String(user.id);
    
    // Query owned documents - strict match on ownerId (must be string and match exactly)
    const ownedDocs = await db
      .collection("documents")
      .find({ 
        $and: [
          { ownerId: { $eq: userId } },
          { ownerId: { $exists: true, $ne: null } }
        ]
      })
      .toArray();

    // Query documents where user is a collaborator - strict match
    const sharedDocs = await db
      .collection("documents")
      .find({
        $and: [
          { "collaborators.userId": { $eq: userId } },
          { ownerId: { $ne: userId } }, // Exclude documents user already owns
          { ownerId: { $exists: true, $ne: null } } // Ensure ownerId exists
        ]
      })
      .toArray();

    // Combine and deduplicate by _id
    const docMap = new Map();
    [...ownedDocs, ...sharedDocs].forEach((doc) => {
      docMap.set(doc._id.toString(), doc);
    });
    const accessibleDocs = Array.from(docMap.values());

    // Sort by updatedAt
    accessibleDocs.sort((a, b) => {
      const aTime = a.updatedAt?.getTime() || 0;
      const bTime = b.updatedAt?.getTime() || 0;
      return bTime - aTime;
    });

    // Final security check: only include documents user actually has access to
    const formattedDocs = accessibleDocs
      .filter((doc) => {
        // Ensure ownerId exists and is a string
        if (!doc.ownerId || typeof doc.ownerId !== 'string') {
          return false; // Skip documents without valid ownerId
        }
        
        // Strict check: must be owner OR valid collaborator
        const docOwnerId = String(doc.ownerId);
        if (docOwnerId === userId) {
          return true;
        }
        
        // Check if user is a collaborator
        const collaborator = doc.collaborators?.find(
          (c: { userId: string }) => String(c.userId) === userId
        );
        return !!collaborator;
      })
      .map((doc) => {
        const accessRole = getUserAccessRole(doc as DocumentWithAccess, userId);

        return {
          id: doc._id.toString(),
          title: doc.title,
          content: doc.content || "",
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          accessRole: accessRole || "viewer", // Fallback, though it shouldn't happen after filtering
        };
      });

    return NextResponse.json(formattedDocs);
  } catch (error) {
    console.error("Error fetching docs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createDocSchema.parse(body);

    const db = await getDb();
    const now = new Date();
    
    // Ensure ownerId is stored as a string
    const userId = String(user.id);

    const result = await db.collection("documents").insertOne({
      ownerId: userId,
      title: validated.title,
      content: "",
      collaborators: [],
      createdAt: now,
      updatedAt: now,
    });

    const doc = await db.collection("documents").findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(
      {
        id: doc!._id.toString(),
        title: doc!.title,
        content: doc!.content || "",
        createdAt: doc!.createdAt,
        updatedAt: doc!.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Error creating doc:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
