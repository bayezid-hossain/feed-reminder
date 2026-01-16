import { auth } from "@/lib/auth";
import { FarmersView } from "@/modules/farmers/ui/views/farmers-view";
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
  return <FarmersView />;
};

export default Page;
