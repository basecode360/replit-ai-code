import { db } from "../db";
import { aars } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * This utility function is used to hard delete AAR records from the database
 * It's used only for admin cleanup purposes
 */
export async function purgeDeletedAARs() {
  try {
    // Get all soft-deleted AARs
    const deletedAARs = await db
      .select()
      .from(aars)
      .where(eq(aars.isDeleted, true));

    if (deletedAARs.length === 0) {
      console.log("No deleted AARs found to purge");
      return { success: true, count: 0 };
    }

    // Actually delete them from the database
    const result = await db.delete(aars).where(eq(aars.isDeleted, true));

    console.log(`Purged ${deletedAARs.length} deleted AARs from the database`);
    return { success: true, count: deletedAARs.length };
  } catch (error) {
    console.error("Error purging deleted AARs:", error);
    return { success: false, error };
  }
}
