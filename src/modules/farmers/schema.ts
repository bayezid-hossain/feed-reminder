import { z } from "zod";

// Regex helper: Allows a-z, A-Z, 0-9 and Spaces
const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;

// 1. Create Farmer (Main Stock Entity)
export const createFarmerSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .regex(alphanumericRegex, "Only English letters and numbers are allowed"),
});

// 2. Add Stock (Main Stock)
export const addStockSchema = z.object({
  farmerId: z.string(),
  amount: z.number().min(1, "Amount must be at least 1"),
  note: z.string().optional(),
});

// 3. Start Cycle
export const startCycleSchema = z.object({
  farmerId: z.string(),
  doc: z.number().min(1, "Doc is required"),
  age: z.number().min(1, "Age must be at least 1").max(34, "Age cannot exceed 34"),
});

// 4. Log Feed (Consumption for a Cycle)
export const logFeedSchema = z.object({
  cycleId: z.string(),
  amount: z.number().min(0.01, "Amount must be positive"),
  note: z.string().optional(),
});

// 5. Mortality
export const addMortalitySchema = z.object({
  cycleId: z.string(),
  amount: z.number().int().min(1, "Mortality must be at least 1"),
  reason: z.string().optional(),
});

// 6. Search Farmers (Main Stock List)
export const farmerSearchSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(10),
  
  search: z.string()
    .optional()
    .refine((val) => !val || alphanumericRegex.test(val), {
      message: "Search can only contain English letters and numbers",
    }),
    
  sortBy: z.string().optional(), 
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// 7. Search Cycles (for a Farmer or All)
export const cycleSearchSchema = z.object({
  farmerId: z.string().optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  page: z.number().default(1),
  pageSize: z.number().default(10),
  search: z.string().optional(),
});
