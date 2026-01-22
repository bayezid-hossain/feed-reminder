import { farmers, cycles, farmerLogs } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type Farmer = InferSelectModel<typeof farmers>;
export type Cycle = InferSelectModel<typeof cycles>;
export type FarmerLog = InferSelectModel<typeof farmerLogs>;

export type CycleWithFarmer = Cycle & {
    farmerName: string;
};
