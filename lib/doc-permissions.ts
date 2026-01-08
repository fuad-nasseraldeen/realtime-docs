import { ObjectId } from "mongodb";

export type AccessRole = "owner" | "editor" | "viewer";

export interface DocumentWithAccess {
  _id: ObjectId;
  ownerId: string;
  title: string;
  content?: string;
  collaborators?: Array<{
    userId: string;
    role: "viewer" | "editor";
    addedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export function getUserAccessRole(
  doc: DocumentWithAccess,
  userId: string
): AccessRole | null {
  if (doc.ownerId === userId) {
    return "owner";
  }

  const collaborator = doc.collaborators?.find(
    (c) => c.userId === userId
  );

  if (collaborator) {
    return collaborator.role;
  }

  return null;
}

export function canView(doc: DocumentWithAccess, userId: string): boolean {
  return getUserAccessRole(doc, userId) !== null;
}

export function canEdit(doc: DocumentWithAccess, userId: string): boolean {
  const role = getUserAccessRole(doc, userId);
  return role === "owner" || role === "editor";
}

export function canDelete(doc: DocumentWithAccess, userId: string): boolean {
  return doc.ownerId === userId;
}

export function canShare(doc: DocumentWithAccess, userId: string): boolean {
  return doc.ownerId === userId;
}
