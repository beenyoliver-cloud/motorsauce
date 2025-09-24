import { getListingById } from "@/listings";

export async function primaryImageForListing(id: string): Promise<string> {
  const l = await getListingById(id);
  return l?.image || "/images/placeholder.png";
}
export const resolveListingImage = primaryImageForListing;
