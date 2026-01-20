"use client";

import ResponsiveDialog from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { addFeedSchema } from "../../../schema";



interface AddFeedModalProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFeedModal = ({ id, open, onOpenChange }: AddFeedModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof addFeedSchema>>({
    resolver: zodResolver(addFeedSchema),
    defaultValues: { amount: 0 },
  });

  const addFeedMutation = useMutation(
    trpc.farmers.addFeed.mutationOptions({
      onSuccess: async () => {
        toast.success("Feed added successfully");
        await queryClient.invalidateQueries(trpc.farmers.getMany.queryOptions({}));
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const onSubmit = (values: z.infer<typeof addFeedSchema>) => {
    addFeedMutation.mutate({ id:id, amount: values.amount });
  };

  return (
    <ResponsiveDialog title="Add Feed" description="Increase the feed amount for this farmer." open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feed Amount</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={addFeedMutation.isPending}>
            {addFeedMutation.isPending ? "Adding..." : "Add Feed"}
          </Button>
        </form>
      </Form>
    </ResponsiveDialog>
  );
};