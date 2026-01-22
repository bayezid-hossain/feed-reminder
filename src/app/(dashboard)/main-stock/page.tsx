import { HydrateClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { MainStockView } from "@/modules/main-stock/ui/views/main-stock-view";

export default async function Page() {
  void trpc.farmers.getMany.prefetch({ page: 1, pageSize: 10 });

  return (
    <HydrateClient>
      <Suspense fallback={<div>Loading...</div>}>
        <MainStockView />
      </Suspense>
    </HydrateClient>
  );
}
