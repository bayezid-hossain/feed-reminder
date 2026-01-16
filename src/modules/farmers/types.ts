import { farmers } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Farmer = InferSelectModel<typeof farmers>;
