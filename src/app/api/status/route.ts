import { getProvider } from "@/lib/ai/provider";
import { json } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = await getProvider();
  return json({ ai: provider !== null, provider: provider?.name ?? null, mode: provider ? "ia" : "demo" });
}
