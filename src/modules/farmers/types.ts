import { farmers } from "@/db/schema";
import { inferSelectModel } from "drizzle-orm";

export type Farmer = inferSelectModel<typeof farmers>;
