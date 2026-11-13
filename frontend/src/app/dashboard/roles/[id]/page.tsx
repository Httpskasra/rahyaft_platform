import RolesPage from "@/features/roles/RolesPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RolesPage initialRoleId={id} />;
}
