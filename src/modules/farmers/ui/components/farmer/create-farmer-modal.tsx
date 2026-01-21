"use client";

import ResponsiveDialog from "@/components/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { farmerInsertSchema } from "../../../schema";

// Define the shape that exactly matches your getHistory router output
type HistorySuggestion = {
  id: string;
  farmerName: string;
  doc: number;
  finalRemaining: number;
  endDate: Date;
  userId: string;
};

interface CreateFarmerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateFarmerModal = ({ open, onOpenChange }: CreateFarmerModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  // Update state to use the narrower HistorySuggestion type
  const [selectedHistory, setSelectedHistory] = useState<HistorySuggestion | null>(null);

  const form = useForm<z.infer<typeof farmerInsertSchema>>({
    resolver: zodResolver(farmerInsertSchema),
    defaultValues: {
      name: "",
      doc: 0,
      inputFeed: 0,
      age: 1, 
    },
  });

  const { data: history } = useQuery(
    trpc.farmers.getHistorySuggestion.queryOptions({}, { enabled: open })
  );

  const watchName = form.watch("name");

  const suggestions = useMemo(() => {
    if (!watchName || !history) return [];
    
    // Remove the explicit ': FarmerHistory' annotation here
    // TypeScript will infer the correct type from history.items automatically
    return history.items.filter((f) =>
      f.farmerName.toLowerCase().includes(watchName.toLowerCase())
    );
  }, [watchName, history]);

  // Update the handler to accept the narrower type
  const handleSelectSuggestion = (farmer: HistorySuggestion) => {
    form.setValue("name", farmer.farmerName);
    setSelectedHistory(farmer);
  };

  const createMutation = useMutation(
    trpc.farmers.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Farmer created");
        await queryClient.invalidateQueries(trpc.farmers.getMany.queryOptions({}));
        onOpenChange(false);
        form.reset();
        setSelectedHistory(null);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const onSubmit = (values: z.infer<typeof farmerInsertSchema>) => {
    const totalFeed = values.inputFeed 
    
    createMutation.mutate({
      ...values,
      inputFeed: totalFeed,
    });
  };

  return (
    <ResponsiveDialog
      title="Create Farmer"
      description="Add a new farmer to the list."
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         <FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    // Ensure the parent is relative so the absolute child positions correctly
    <FormItem className="relative">
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input 
          placeholder="Farmer Name" 
          {...field} 
          autoComplete="off" 
          onChange={(e) => {
              field.onChange(e);
              if (selectedHistory) setSelectedHistory(null);
          }}
        />
      </FormControl>
      
      {suggestions.length > 0 && (
        <div className="relative z-50 w-full bg-popover border rounded-md shadow-md max-h-[100px] overflow-y-auto mt-1">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
              onClick={() => handleSelectSuggestion(f)}
            >
              <span className="font-medium">{f.farmerName}</span>
              <span className="text-xs text-muted-foreground">
                Carry-over: {f.finalRemaining}
              </span>
            </button>
          ))}
        </div>
      )}
      <FormMessage />
    </FormItem>
  )}
/>

          {/* ... Rest of your form (DOC, Input Feed) ... */}
          
          <div className="flex gap-4">
                <FormField
                    control={form.control}
                    name="doc"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Input DOC</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Number of birds" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                    <FormItem className="w-24">
                        <FormLabel>Start Age</FormLabel>
                        <FormControl>
                        <Input 
                            type="number" 
                            min={1}
                            {...field}
                            placeholder="1" 
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

          <FormField
            control={form.control}
            name="inputFeed"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>New Feed Amount</FormLabel>
                  {selectedHistory && selectedHistory.finalRemaining > 0 && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      + {selectedHistory.finalRemaining} from previous cycle
                    </Badge>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </Form>
    </ResponsiveDialog>
  );
};