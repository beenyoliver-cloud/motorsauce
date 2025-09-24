type Props = {
  from: string;
  amount?: string;
  status?: "pending" | "accepted" | "declined" | "countered";
  note?: string;
};
export default function OfferMessage({ from, amount, status, note }: Props) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm">
      <div className="font-semibold">{from}</div>
      <div className="text-gray-700">{amount ?? ""}</div>
      {status && <div className="text-xs text-gray-500">Status: {status}</div>}
      {note && <p className="mt-1 text-gray-600">{note}</p>}
    </div>
  );
}
