import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    const db = await getDb();

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      email: validated.email,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user
    const result = await db.collection("users").insertOne({
      email: validated.email,
      passwordHash,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "User created successfully", userId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    // Log the full error for debugging
    console.error("Signup error:", error);
    
    // Check if it's a MongoDB connection error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Mongo URI") || errorMessage.includes("MongoDB")) {
      console.error("MongoDB connection error - check MONGODB_URI environment variable");
      return NextResponse.json(
        { error: "Database connection error. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
