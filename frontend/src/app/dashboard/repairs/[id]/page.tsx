import RepairDetailPage from "@/features/repairs/RepairDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RepairDetailPage repairId={id} />;
}
