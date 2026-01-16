import { z } from "zod";

export const farmerInsertSchema = z.object({
  name: z.string().min(1, "Name is required"),
  doc: z.string().min(1, "Doc is required"),
  inputFeed: z.number().min(0, "Input feed must be a positive number"),
});

export const farmerSearchSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(10),
  search: z.string().optional(),
  status: z.enum(["active", "history"]).default("active"),
});
