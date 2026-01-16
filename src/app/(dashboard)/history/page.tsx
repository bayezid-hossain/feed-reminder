import { auth } from "@/lib/auth";
import { HistoryView } from "@/modules/farmers/ui/views/history-view";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }
  return <HistoryView />;
};

export default Page;
