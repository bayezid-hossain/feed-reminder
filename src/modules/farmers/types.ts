import { farmers,farmerHistory } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Farmer = InferSelectModel<typeof farmers>;
export type FarmerHistory = InferSelectModel<typeof farmerHistory>; 