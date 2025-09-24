export type Listing = {
  id: string;
  title: string;
  price: string;           // "£123.45"
  image: string;
  category: string;        // "OEM" | "Aftermarket" | "Tool"
  seller: { name: string; avatar: string; rating: number };
};

export const listings: Listing[] = [
  {
    id: "PAD-0102",
    title: "EBC YellowStuff Brake Pads (F87 M2 Competition)",
    price: "£129.99",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=80",
    category: "Aftermarket",
    seller: { name: "AutoJoe", avatar: "/images/seller1.jpg", rating: 4.8 },
  },
  {
    id: "INT-2001",
    title: "OEM Air Intake – BMW E46 M3",
    price: "£120.00",
    image: "https://images.unsplash.com/photo-1598476514298-7113a00d9a6d?w=1200&q=80",
    category: "OEM",
    seller: { name: "FilterKing", avatar: "/images/seller4.jpg", rating: 4.6 },
  },
  {
    id: "WHE-4410",
    title: "19\" Wheel Set – Style 437M (Replica)",
    price: "£899.00",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80",
    category: "Aftermarket",
    seller: { name: "WheelMaster", avatar: "/images/seller2.jpg", rating: 4.5 },
  },
  {
    id: "TOO-9003",
    title: "OBD2 Scanner (Bluetooth)",
    price: "£49.95",
    image: "https://images.unsplash.com/photo-1588625143728-8933b2c4e1ee?w=1200&q=80",
    category: "Tool",
    seller: { name: "ScanPro", avatar: "/images/seller3.jpg", rating: 4.9 },
  },
];

export async function getAllListings() {
  return listings;
}
export async function getListingById(id: string) {
  return listings.find((l) => String(l.id) === String(id)) || null;
}
export default listings;
